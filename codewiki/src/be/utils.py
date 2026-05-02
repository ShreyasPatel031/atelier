import re
from pathlib import Path
from typing import List, Tuple
import logging
import tiktoken


logger = logging.getLogger(__name__)

# ------------------------------------------------------------
# ---------------------- Complexity Check --------------------
# ------------------------------------------------------------

def is_complex_module(components: dict[str, any], core_component_ids: list[str]) -> bool:
    files = set()
    for component_id in core_component_ids:
        if component_id in components:
            files.add(components[component_id].file_path)

    result = len(files) > 1

    return result


# ------------------------------------------------------------
# ---------------------- Token Counting ---------------------
# ------------------------------------------------------------

enc = tiktoken.encoding_for_model("gpt-4")

def count_tokens(text: str) -> int:
    """
    Count the number of tokens in a text.
    """
    length = len(enc.encode(text, disallowed_special=()))
    # logger.debug(f"Number of tokens: {length}")
    return length


def count_module_tokens(component_ids: list[str], components: dict[str, any]) -> int:
    """
    Count tokens for a set of components using full file contents.
    
    This matches how format_user_prompt builds the actual LLM prompt,
    ensuring consistent token counting between the clustering threshold
    check and the actual prompt sent to the LLM.
    
    Args:
        component_ids: List of component IDs to count tokens for
        components: Dictionary mapping component IDs to component objects
        
    Returns:
        Number of tokens for the full file contents
    """
    from codewiki.src.file_manager import file_manager
    
    # Group components by file path (same logic as format_user_prompt)
    grouped: dict[str, list[str]] = {}
    for comp_id in component_ids:
        if comp_id not in components:
            continue
        path = components[comp_id].relative_path
        if path not in grouped:
            grouped[path] = []
        grouped[path].append(comp_id)
    
    # Build content string using full files (same as format_user_prompt)
    content = ""
    for path, comp_ids_in_file in grouped.items():
        content += f"# File: {path}\n\n"
        content += f"## Core Components in this file:\n"
        for comp_id in comp_ids_in_file:
            content += f"- {comp_id}\n"
        content += "\n## File Content:\n"
        try:
            content += file_manager.load_text(components[comp_ids_in_file[0]].file_path)
        except (FileNotFoundError, IOError):
            pass
        content += "\n\n"
    
    return count_tokens(content)


# ------------------------------------------------------------
# ---------------------- Mermaid Validation -----------------
# ------------------------------------------------------------

async def validate_mermaid_diagrams(md_file_path: str, relative_path: str) -> str:
    """
    Validate all Mermaid diagrams in a markdown file.
    
    Args:
        md_file_path: Path to the markdown file to check
        relative_path: Relative path to the markdown file
    Returns:
        "All mermaid diagrams are syntax correct" if all diagrams are valid,
        otherwise returns error message with details about invalid diagrams
    """

    try:
        # Read the markdown file
        file_path = Path(md_file_path)
        if not file_path.exists():
            return f"Error: File '{md_file_path}' does not exist"
        
        content = file_path.read_text(encoding='utf-8')
        
        # Extract all mermaid code blocks
        mermaid_blocks = extract_mermaid_blocks(content)
        
        if not mermaid_blocks:
            return "No mermaid diagrams found in the file"
        
        # Validate each mermaid diagram sequentially to avoid segfaults
        errors = []
        for i, (line_start, diagram_content) in enumerate(mermaid_blocks, 1):
            error_msg = await validate_single_diagram(diagram_content, i, line_start)
            if error_msg:
                errors.append("\n")
                errors.append(error_msg)
        
        # if errors:
        #     logger.debug(f"Mermaid syntax errors found in file: {md_file_path}: {errors}")
        
        if errors:
            return "Mermaid syntax errors found in file: " + relative_path + "\n" + "\n".join(errors)
        else:
            return "All mermaid diagrams in file: " + relative_path + " are syntax correct"
            
    except Exception as e:
        return f"Error processing file: {str(e)}"


def extract_mermaid_blocks(content: str) -> List[Tuple[int, str]]:
    """
    Extract all mermaid code blocks from markdown content.
    
    Returns:
        List of tuples containing (line_number, diagram_content)
    """
    mermaid_blocks = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for mermaid code block start
        if line == '```mermaid' or line.startswith('```mermaid'):
            start_line = i + 1
            diagram_lines = []
            i += 1
            
            # Collect lines until we find the closing ```
            while i < len(lines):
                if lines[i].strip() == '```':
                    break
                diagram_lines.append(lines[i])
                i += 1
            
            if diagram_lines:  # Only add non-empty diagrams
                diagram_content = '\n'.join(diagram_lines)
                mermaid_blocks.append((start_line, diagram_content))
        
        i += 1
    
    return mermaid_blocks


async def validate_single_diagram(diagram_content: str, diagram_num: int, line_start: int) -> str:
    """Validate a single mermaid diagram via the shared Mermaid.js 11 parser.

    Returns an empty string when the diagram parses, otherwise a formatted
    error message that maps the parser's intra-diagram line back to the
    enclosing markdown file's line.
    """
    from codewiki.src.be.mermaid_validator import validate_mermaid

    vr = validate_mermaid(diagram_content, source_info=f"diagram_{diagram_num}")
    if vr.valid:
        return ""

    parts: List[str] = []
    for err in vr.errors:
        if err.line_number is not None:
            actual_line = line_start + err.line_number
            parts.append(f"line {actual_line}: {err.message}")
        else:
            parts.append(err.message)
    return f"Diagram {diagram_num}: " + " | ".join(parts)


def make_response_logger_hooks(module_name: str):
    """Create a Hooks capability that logs every Gemini ModelResponse for debugging empty-response failures."""
    try:
        from pydantic_ai.capabilities.hooks import Hooks
    except ImportError as e:
        # Older pydantic-ai or minimal installs lack pydantic_ai.capabilities; agent must still run.
        if not getattr(make_response_logger_hooks, "_import_warned", False):
            logger.warning(
                "pydantic_ai.capabilities.hooks unavailable (%s); model response hooks disabled. "
                "Upgrade pydantic-ai if you need hook logging.",
                e,
            )
            make_response_logger_hooks._import_warned = True
        return []

    hooks = Hooks()

    @hooks.on.after_model_request
    def _log_model_response(ctx, *, request_context, response):
        parts_summary = []
        for p in response.parts:
            ptype = type(p).__name__
            if hasattr(p, 'content'):
                parts_summary.append(f"{ptype}(len={len(str(p.content))})")
            elif hasattr(p, 'tool_name'):
                parts_summary.append(f"{ptype}(tool={p.tool_name})")
            else:
                parts_summary.append(ptype)
        is_empty = not response.parts
        logger.info(
            "[MODEL_RESPONSE] module=%s parts=%d empty=%s finish_reason=%s parts_detail=%s provider_details=%s",
            module_name, len(response.parts), is_empty, response.finish_reason,
            parts_summary[:10], getattr(response, 'provider_details', None),
        )
        if is_empty:
            logger.error(
                "[MODEL_RESPONSE] EMPTY RESPONSE from Gemini for module=%s "
                "finish_reason=%s provider_details=%s full_response=%r",
                module_name, response.finish_reason,
                getattr(response, 'provider_details', None),
                response,
            )
        return response

    return [hooks]


if __name__ == "__main__":
    # Test with the provided file
    import asyncio
    test_file = "output/docs/SWE_agent-docs/agent_hooks.md"
    result = asyncio.run(validate_mermaid_diagrams(test_file, "agent_hooks.md"))
    print(result)