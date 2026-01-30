"""
Generation Tracker - Comprehensive logging for documentation generation failures

Agent 3 (Reliability) - This module tracks every step of generation and reports:
- Rate limit errors
- Context length exceeded
- LLM failures
- File write failures
- Module tree sync issues
- Missing documentation reasons

Usage:
    from codewiki.src.be.generation_tracker import get_generation_tracker, GenerationEvent
    
    tracker = get_generation_tracker()
    tracker.start_generation("repo_name")
    
    # Track events
    tracker.track_module_start("operator", 15, 50000)
    tracker.track_llm_call("operator", success=True, tokens=45000)
    tracker.track_module_complete("operator", success=True)
    
    # Or track failures
    tracker.track_error("operator", "RATE_LIMIT", "429 Too Many Requests")
    
    # Get report
    report = tracker.get_report()
"""

import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Categorized error types for analysis."""
    RATE_LIMIT = "rate_limit"
    CONTEXT_LENGTH = "context_length_exceeded"
    TIMEOUT = "timeout"
    AUTH_ERROR = "auth_error"
    API_ERROR = "api_error"
    PARSE_ERROR = "parse_error"
    FILE_WRITE_ERROR = "file_write_error"
    MODULE_TREE_SYNC = "module_tree_sync"
    AGENT_CRASH = "agent_crash"
    UNKNOWN = "unknown"


@dataclass
class GenerationEvent:
    """Single event during generation."""
    timestamp: str
    event_type: str
    module: str
    details: Dict[str, Any] = field(default_factory=dict)
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    duration_s: float = 0.0
    success: bool = True


@dataclass
class ModuleStats:
    """Statistics for a single module."""
    module_name: str
    component_count: int = 0
    prompt_tokens: int = 0
    llm_calls: int = 0
    llm_success: int = 0
    llm_failures: int = 0
    retries: int = 0
    total_duration_s: float = 0.0
    md_file_created: bool = False
    in_module_tree: bool = False
    has_diagram: bool = False
    has_title: bool = False
    has_description: bool = False
    errors: List[Dict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    @property
    def success(self) -> bool:
        return self.md_file_created and len(self.errors) == 0


@dataclass
class GenerationReport:
    """Complete generation report."""
    repo_name: str
    start_time: str
    end_time: Optional[str] = None
    total_duration_s: float = 0.0
    
    # Module stats
    total_modules: int = 0
    successful_modules: int = 0
    failed_modules: int = 0
    
    # LLM stats
    total_llm_calls: int = 0
    successful_llm_calls: int = 0
    failed_llm_calls: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0
    
    # Error breakdown
    errors_by_type: Dict[str, int] = field(default_factory=dict)
    rate_limit_count: int = 0
    context_exceeded_count: int = 0
    timeout_count: int = 0
    
    # Detailed tracking
    modules: Dict[str, ModuleStats] = field(default_factory=dict)
    events: List[GenerationEvent] = field(default_factory=list)
    
    # Files
    md_files_created: List[str] = field(default_factory=list)
    md_files_missing: List[str] = field(default_factory=list)


class GenerationTracker:
    """Tracks all generation events and produces reports."""
    
    def __init__(self):
        self.report: Optional[GenerationReport] = None
        self._module_start_times: Dict[str, float] = {}
        self._generation_start: float = 0
    
    def start_generation(self, repo_name: str) -> None:
        """Start tracking a new generation run."""
        self.report = GenerationReport(
            repo_name=repo_name,
            start_time=datetime.now().isoformat()
        )
        self._generation_start = time.time()
        self._module_start_times = {}
        
        logger.info(f"[GENERATION_TRACKER] Started tracking generation for: {repo_name}")
    
    def track_event(self, event: GenerationEvent) -> None:
        """Track a generation event."""
        if self.report:
            self.report.events.append(event)
    
    def track_module_start(self, module_name: str, component_count: int, 
                           prompt_tokens: int) -> None:
        """Track start of module processing."""
        if not self.report:
            return
        
        self._module_start_times[module_name] = time.time()
        
        if module_name not in self.report.modules:
            self.report.modules[module_name] = ModuleStats(module_name=module_name)
        
        stats = self.report.modules[module_name]
        stats.component_count = component_count
        stats.prompt_tokens = prompt_tokens
        
        self.track_event(GenerationEvent(
            timestamp=datetime.now().isoformat(),
            event_type="module_start",
            module=module_name,
            details={
                "component_count": component_count,
                "prompt_tokens": prompt_tokens
            }
        ))
        
        logger.info(f"[GENERATION_TRACKER] Module started: {module_name} "
                   f"(components={component_count}, tokens={prompt_tokens})")
    
    def track_llm_call(self, module_name: str, success: bool, 
                       prompt_tokens: int = 0, completion_tokens: int = 0,
                       duration_s: float = 0, model: str = "",
                       error_type: str = None, error_message: str = None) -> None:
        """Track an LLM call."""
        if not self.report:
            return
        
        if module_name not in self.report.modules:
            self.report.modules[module_name] = ModuleStats(module_name=module_name)
        
        stats = self.report.modules[module_name]
        stats.llm_calls += 1
        
        self.report.total_llm_calls += 1
        self.report.total_tokens += prompt_tokens + completion_tokens
        
        if success:
            stats.llm_success += 1
            self.report.successful_llm_calls += 1
        else:
            stats.llm_failures += 1
            self.report.failed_llm_calls += 1
            
            # Categorize error
            if error_type:
                self.report.errors_by_type[error_type] = \
                    self.report.errors_by_type.get(error_type, 0) + 1
                
                if error_type == ErrorType.RATE_LIMIT.value:
                    self.report.rate_limit_count += 1
                elif error_type == ErrorType.CONTEXT_LENGTH.value:
                    self.report.context_exceeded_count += 1
                elif error_type == ErrorType.TIMEOUT.value:
                    self.report.timeout_count += 1
            
            stats.errors.append({
                "type": error_type or "unknown",
                "message": error_message,
                "tokens": prompt_tokens
            })
        
        self.track_event(GenerationEvent(
            timestamp=datetime.now().isoformat(),
            event_type="llm_call",
            module=module_name,
            details={
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens
            },
            duration_s=duration_s,
            success=success,
            error_type=error_type,
            error_message=error_message
        ))
        
        status = "✓" if success else "✗"
        logger.info(f"[GENERATION_TRACKER] LLM call {status}: {module_name} "
                   f"(tokens={prompt_tokens}+{completion_tokens})")
    
    def track_module_complete(self, module_name: str, success: bool,
                              md_file_created: bool = False,
                              in_module_tree: bool = False,
                              has_diagram: bool = False,
                              has_title: bool = False,
                              has_description: bool = False,
                              error_type: str = None,
                              error_message: str = None) -> None:
        """Track module completion."""
        if not self.report:
            return
        
        if module_name not in self.report.modules:
            self.report.modules[module_name] = ModuleStats(module_name=module_name)
        
        stats = self.report.modules[module_name]
        
        # Calculate duration
        if module_name in self._module_start_times:
            stats.total_duration_s = time.time() - self._module_start_times[module_name]
        
        stats.md_file_created = md_file_created
        stats.in_module_tree = in_module_tree
        stats.has_diagram = has_diagram
        stats.has_title = has_title
        stats.has_description = has_description
        
        self.report.total_modules += 1
        if success and md_file_created:
            self.report.successful_modules += 1
            self.report.md_files_created.append(f"{module_name}.md")
        else:
            self.report.failed_modules += 1
            if not md_file_created:
                self.report.md_files_missing.append(f"{module_name}.md")
            
            if error_type:
                stats.errors.append({
                    "type": error_type,
                    "message": error_message
                })
                self.report.errors_by_type[error_type] = \
                    self.report.errors_by_type.get(error_type, 0) + 1
        
        self.track_event(GenerationEvent(
            timestamp=datetime.now().isoformat(),
            event_type="module_complete",
            module=module_name,
            details={
                "md_file_created": md_file_created,
                "in_module_tree": in_module_tree,
                "has_diagram": has_diagram
            },
            duration_s=stats.total_duration_s,
            success=success,
            error_type=error_type,
            error_message=error_message
        ))
        
        status = "✓" if success else "✗"
        logger.info(f"[GENERATION_TRACKER] Module complete {status}: {module_name} "
                   f"(md={md_file_created}, diagram={has_diagram})")
    
    def track_error(self, module_name: str, error_type: str, 
                    error_message: str, details: Dict = None) -> None:
        """Track a specific error."""
        if not self.report:
            return
        
        # Categorize error type
        categorized_type = self._categorize_error(error_type, error_message)
        
        self.report.errors_by_type[categorized_type] = \
            self.report.errors_by_type.get(categorized_type, 0) + 1
        
        if categorized_type == ErrorType.RATE_LIMIT.value:
            self.report.rate_limit_count += 1
        elif categorized_type == ErrorType.CONTEXT_LENGTH.value:
            self.report.context_exceeded_count += 1
        elif categorized_type == ErrorType.TIMEOUT.value:
            self.report.timeout_count += 1
        
        if module_name and module_name in self.report.modules:
            self.report.modules[module_name].errors.append({
                "type": categorized_type,
                "message": error_message,
                "details": details
            })
        
        self.track_event(GenerationEvent(
            timestamp=datetime.now().isoformat(),
            event_type="error",
            module=module_name,
            details=details or {},
            error_type=categorized_type,
            error_message=error_message,
            success=False
        ))
        
        logger.error(f"[GENERATION_TRACKER] Error: {module_name} - {categorized_type}: {error_message}")
    
    def _categorize_error(self, error_type: str, error_message: str) -> str:
        """Categorize an error based on type and message."""
        msg_lower = error_message.lower() if error_message else ""
        type_lower = error_type.lower() if error_type else ""
        
        if "429" in msg_lower or "rate" in msg_lower or "rate_limit" in type_lower:
            return ErrorType.RATE_LIMIT.value
        elif "context" in msg_lower or "length" in msg_lower or "too long" in msg_lower:
            return ErrorType.CONTEXT_LENGTH.value
        elif "timeout" in msg_lower:
            return ErrorType.TIMEOUT.value
        elif "401" in msg_lower or "auth" in msg_lower:
            return ErrorType.AUTH_ERROR.value
        elif "api" in type_lower or "500" in msg_lower or "502" in msg_lower:
            return ErrorType.API_ERROR.value
        elif "parse" in msg_lower or "json" in msg_lower:
            return ErrorType.PARSE_ERROR.value
        elif "file" in msg_lower or "write" in msg_lower or "permission" in msg_lower:
            return ErrorType.FILE_WRITE_ERROR.value
        else:
            return error_type or ErrorType.UNKNOWN.value
    
    def complete_generation(self, docs_dir: str = None) -> None:
        """Mark generation as complete and finalize stats."""
        if not self.report:
            return
        
        self.report.end_time = datetime.now().isoformat()
        self.report.total_duration_s = time.time() - self._generation_start
        
        # Estimate cost (rough: $0.02 per 1K tokens for GPT-4o equivalent)
        self.report.estimated_cost = (self.report.total_tokens / 1000) * 0.02
        
        # If docs_dir provided, scan for actual files
        if docs_dir:
            self._scan_docs_directory(docs_dir)
        
        logger.info(f"[GENERATION_TRACKER] Generation complete: "
                   f"{self.report.successful_modules}/{self.report.total_modules} modules, "
                   f"{self.report.total_tokens} tokens, ${self.report.estimated_cost:.2f}")
    
    def _scan_docs_directory(self, docs_dir: str) -> None:
        """Scan docs directory to find missing files."""
        if not self.report:
            return
        
        docs_path = Path(docs_dir)
        if not docs_path.exists():
            return
        
        # Get all .md files that were created
        actual_md_files = {f.stem for f in docs_path.glob("*.md")}
        
        # Compare with modules in tree
        for module_name, stats in self.report.modules.items():
            if module_name in actual_md_files:
                stats.md_file_created = True
                if f"{module_name}.md" not in self.report.md_files_created:
                    self.report.md_files_created.append(f"{module_name}.md")
            else:
                stats.md_file_created = False
                if f"{module_name}.md" not in self.report.md_files_missing:
                    self.report.md_files_missing.append(f"{module_name}.md")
    
    def get_report(self) -> Optional[Dict]:
        """Get the generation report as a dictionary."""
        if not self.report:
            return None
        
        report_dict = {
            "repo_name": self.report.repo_name,
            "start_time": self.report.start_time,
            "end_time": self.report.end_time,
            "total_duration_s": round(self.report.total_duration_s, 1),
            "summary": {
                "total_modules": self.report.total_modules,
                "successful_modules": self.report.successful_modules,
                "failed_modules": self.report.failed_modules,
                "success_rate": round(
                    self.report.successful_modules / max(self.report.total_modules, 1) * 100, 1
                ),
                "total_llm_calls": self.report.total_llm_calls,
                "successful_llm_calls": self.report.successful_llm_calls,
                "failed_llm_calls": self.report.failed_llm_calls,
                "total_tokens": self.report.total_tokens,
                "estimated_cost_usd": round(self.report.estimated_cost, 2)
            },
            "errors": {
                "by_type": self.report.errors_by_type,
                "rate_limit_count": self.report.rate_limit_count,
                "context_exceeded_count": self.report.context_exceeded_count,
                "timeout_count": self.report.timeout_count
            },
            "files": {
                "created": len(self.report.md_files_created),
                "missing": len(self.report.md_files_missing),
                "missing_list": self.report.md_files_missing[:20]  # Limit for readability
            },
            "modules": {
                name: {
                    "success": stats.success,
                    "component_count": stats.component_count,
                    "prompt_tokens": stats.prompt_tokens,
                    "llm_calls": stats.llm_calls,
                    "md_file_created": stats.md_file_created,
                    "has_diagram": stats.has_diagram,
                    "errors": stats.errors
                }
                for name, stats in list(self.report.modules.items())[:50]  # Limit
            }
        }
        
        return report_dict
    
    def print_report(self) -> None:
        """Print a formatted report to the console."""
        if not self.report:
            print("No generation report available")
            return
        
        print("\n" + "=" * 70)
        print("                 GENERATION TRACKING REPORT")
        print("=" * 70)
        print(f"\nRepository: {self.report.repo_name}")
        print(f"Duration: {self.report.total_duration_s:.1f}s")
        print(f"Start: {self.report.start_time}")
        print(f"End: {self.report.end_time}")
        
        print("\n--- MODULE SUMMARY ---")
        print(f"Total modules: {self.report.total_modules}")
        print(f"Successful: {self.report.successful_modules}")
        print(f"Failed: {self.report.failed_modules}")
        success_rate = self.report.successful_modules / max(self.report.total_modules, 1) * 100
        print(f"Success rate: {success_rate:.1f}%")
        
        print("\n--- LLM SUMMARY ---")
        print(f"Total calls: {self.report.total_llm_calls}")
        print(f"Successful: {self.report.successful_llm_calls}")
        print(f"Failed: {self.report.failed_llm_calls}")
        print(f"Total tokens: {self.report.total_tokens:,}")
        print(f"Estimated cost: ${self.report.estimated_cost:.2f}")
        
        print("\n--- ERROR BREAKDOWN ---")
        if self.report.errors_by_type:
            for error_type, count in sorted(self.report.errors_by_type.items(), 
                                           key=lambda x: -x[1]):
                print(f"  {error_type}: {count}")
        else:
            print("  No errors")
        
        print(f"\nRate limit errors: {self.report.rate_limit_count}")
        print(f"Context exceeded: {self.report.context_exceeded_count}")
        print(f"Timeout errors: {self.report.timeout_count}")
        
        print("\n--- FILE SUMMARY ---")
        print(f"MD files created: {len(self.report.md_files_created)}")
        print(f"MD files missing: {len(self.report.md_files_missing)}")
        
        if self.report.md_files_missing:
            print("\nMissing files:")
            for f in self.report.md_files_missing[:10]:
                print(f"  - {f}")
            if len(self.report.md_files_missing) > 10:
                print(f"  ... and {len(self.report.md_files_missing) - 10} more")
        
        # Show failed modules
        failed = [m for m, s in self.report.modules.items() if not s.success]
        if failed:
            print("\n--- FAILED MODULES ---")
            for module_name in failed[:10]:
                stats = self.report.modules[module_name]
                errors = [e.get("type", "unknown") for e in stats.errors]
                print(f"  {module_name}: {', '.join(errors) or 'md file not created'}")
            if len(failed) > 10:
                print(f"  ... and {len(failed) - 10} more")
        
        print("\n" + "=" * 70)
    
    def save_report(self, path: str) -> None:
        """Save report to JSON file."""
        report = self.get_report()
        if report:
            with open(path, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"[GENERATION_TRACKER] Report saved to: {path}")


# Global singleton
_tracker: Optional[GenerationTracker] = None


def get_generation_tracker() -> GenerationTracker:
    """Get the global generation tracker singleton."""
    global _tracker
    if _tracker is None:
        _tracker = GenerationTracker()
    return _tracker


def reset_generation_tracker() -> None:
    """Reset the global tracker."""
    global _tracker
    _tracker = GenerationTracker()
