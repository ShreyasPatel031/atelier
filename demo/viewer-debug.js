/**
 * CodeWiki Viewer Debug Module
 * Agent 3 (Reliability) - Error tracking and diagnostics
 * 
 * This script provides browser-side error tracking for the CodeWiki viewer.
 * It captures mermaid rendering errors, broken links, and metadata issues.
 * 
 * Usage: Press Ctrl+Shift+D to view the debug report in console.
 */

(function() {
    'use strict';
    
    // ============================================================
    // DEBUG STATE
    // ============================================================
    
    window.CODEWIKI_DEBUG = {
        mermaidErrors: [],
        brokenLinks: [],
        metadataIssues: [],
        hoverFailures: [],
        navigationEvents: [],
        startTime: Date.now(),
        version: '1.0.0'
    };
    
    // ============================================================
    // ERROR TRACKING FUNCTIONS
    // ============================================================
    
    /**
     * Track mermaid diagram rendering errors
     * Called by viewer.html when mermaid.render() fails
     */
    window.trackMermaidError = function(message, diagramSnippet) {
        const error = {
            message: message,
            diagramSnippet: diagramSnippet,
            timestamp: Date.now(),
            url: window.location.href,
            moduleId: window.currentModuleId || 'unknown'
        };
        window.CODEWIKI_DEBUG.mermaidErrors.push(error);
        console.warn('[CodeWiki Debug] Mermaid error:', message);
        
        // Also log to console group for visibility
        console.groupCollapsed('%c[Mermaid Error]', 'color: #dc2626; font-weight: bold;', message);
        console.log('Diagram snippet:', diagramSnippet);
        console.log('Module:', error.moduleId);
        console.groupEnd();
    };
    
    /**
     * Track broken/unresolvable links in diagrams
     * Called by viewer.html when a node click target cannot be resolved
     */
    window.trackBrokenLink = function(nodeId, context) {
        const link = {
            nodeId: nodeId,
            context: context,
            timestamp: Date.now(),
            url: window.location.href
        };
        window.CODEWIKI_DEBUG.brokenLinks.push(link);
        
        // Only warn on first occurrence of each nodeId to reduce noise
        const isDuplicate = window.CODEWIKI_DEBUG.brokenLinks
            .filter(l => l.nodeId === nodeId).length > 1;
        
        if (!isDuplicate) {
            console.warn('[CodeWiki Debug] Broken link:', nodeId, context);
        }
    };
    
    /**
     * Track metadata validation issues
     * Called by viewer.html when modules are missing title/description
     */
    window.trackMetadataIssue = function(moduleId, issue) {
        const metaIssue = {
            moduleId: moduleId,
            issue: issue,
            timestamp: Date.now()
        };
        window.CODEWIKI_DEBUG.metadataIssues.push(metaIssue);
        console.warn('[CodeWiki Debug] Metadata issue:', moduleId, issue);
    };
    
    /**
     * Track hover/tooltip failures
     * Called when tooltip fails to display
     */
    window.trackHoverFailure = function(nodeId, reason) {
        const failure = {
            nodeId: nodeId,
            reason: reason,
            timestamp: Date.now()
        };
        window.CODEWIKI_DEBUG.hoverFailures.push(failure);
        console.warn('[CodeWiki Debug] Hover failure:', nodeId, reason);
    };
    
    /**
     * Track navigation events for debugging
     */
    window.trackNavigation = function(from, to, action) {
        window.CODEWIKI_DEBUG.navigationEvents.push({
            from: from,
            to: to,
            action: action,
            timestamp: Date.now()
        });
    };
    
    // ============================================================
    // REPORTING FUNCTIONS
    // ============================================================
    
    /**
     * Generate and display debug report
     */
    window.showCodeWikiDebug = function() {
        const d = window.CODEWIKI_DEBUG;
        const elapsed = ((Date.now() - d.startTime) / 1000).toFixed(1);
        
        console.log('\n');
        console.log('%c╔══════════════════════════════════════════════════════════╗', 'color: #2563eb;');
        console.log('%c║          CodeWiki Reliability Report v' + d.version + '              ║', 'color: #2563eb; font-weight: bold;');
        console.log('%c╠══════════════════════════════════════════════════════════╣', 'color: #2563eb;');
        console.log('%c║ Session Duration:    ' + elapsed.padStart(6) + 's                              ║', 'color: #64748b;');
        console.log('%c╠══════════════════════════════════════════════════════════╣', 'color: #2563eb;');
        
        // Summary counts with color coding
        const mermaidColor = d.mermaidErrors.length > 0 ? '#dc2626' : '#16a34a';
        const linksColor = d.brokenLinks.length > 0 ? '#ea580c' : '#16a34a';
        const metaColor = d.metadataIssues.length > 0 ? '#ea580c' : '#16a34a';
        const hoverColor = d.hoverFailures.length > 0 ? '#ea580c' : '#16a34a';
        
        console.log('%c║ Mermaid Errors:      ' + d.mermaidErrors.length.toString().padStart(6) + '                              ║', `color: ${mermaidColor};`);
        console.log('%c║ Broken Links:        ' + d.brokenLinks.length.toString().padStart(6) + '                              ║', `color: ${linksColor};`);
        console.log('%c║ Metadata Issues:     ' + d.metadataIssues.length.toString().padStart(6) + '                              ║', `color: ${metaColor};`);
        console.log('%c║ Hover Failures:      ' + d.hoverFailures.length.toString().padStart(6) + '                              ║', `color: ${hoverColor};`);
        console.log('%c╚══════════════════════════════════════════════════════════╝', 'color: #2563eb;');
        
        // Detailed error lists
        if (d.mermaidErrors.length > 0) {
            console.group('%c🔴 Mermaid Errors (' + d.mermaidErrors.length + ')', 'color: #dc2626; font-weight: bold;');
            d.mermaidErrors.forEach((e, i) => {
                console.log(`${i+1}. [${e.moduleId}] ${e.message}`);
                if (e.diagramSnippet) {
                    console.log('   Snippet:', e.diagramSnippet.substring(0, 200) + '...');
                }
            });
            console.groupEnd();
        }
        
        if (d.brokenLinks.length > 0) {
            // Deduplicate broken links for reporting
            const uniqueLinks = {};
            d.brokenLinks.forEach(l => {
                const key = l.nodeId;
                if (!uniqueLinks[key]) {
                    uniqueLinks[key] = { ...l, count: 1 };
                } else {
                    uniqueLinks[key].count++;
                }
            });
            
            console.group('%c🟠 Broken Links (' + Object.keys(uniqueLinks).length + ' unique)', 'color: #ea580c; font-weight: bold;');
            Object.values(uniqueLinks).forEach((l, i) => {
                const countStr = l.count > 1 ? ` (x${l.count})` : '';
                console.log(`${i+1}. ${l.nodeId}${countStr} - context: ${l.context?.contextModuleId || 'N/A'}`);
            });
            console.groupEnd();
        }
        
        if (d.metadataIssues.length > 0) {
            console.group('%c🟡 Metadata Issues (' + d.metadataIssues.length + ')', 'color: #ea580c; font-weight: bold;');
            d.metadataIssues.forEach((m, i) => {
                console.log(`${i+1}. [${m.moduleId}] ${m.issue}`);
            });
            console.groupEnd();
        }
        
        if (d.hoverFailures.length > 0) {
            console.group('%c🟡 Hover Failures (' + d.hoverFailures.length + ')', 'color: #ea580c; font-weight: bold;');
            d.hoverFailures.forEach((h, i) => {
                console.log(`${i+1}. ${h.nodeId}: ${h.reason}`);
            });
            console.groupEnd();
        }
        
        console.log('\n%cTip: Access raw data via window.CODEWIKI_DEBUG', 'color: #64748b; font-style: italic;');
        console.log('%cTip: Export report via window.exportDebugReport()', 'color: #64748b; font-style: italic;');
        
        return d;
    };
    
    /**
     * Export debug report as JSON
     */
    window.exportDebugReport = function() {
        const d = window.CODEWIKI_DEBUG;
        const report = {
            version: d.version,
            generatedAt: new Date().toISOString(),
            sessionDuration: (Date.now() - d.startTime) / 1000,
            url: window.location.href,
            summary: {
                mermaidErrors: d.mermaidErrors.length,
                brokenLinks: d.brokenLinks.length,
                metadataIssues: d.metadataIssues.length,
                hoverFailures: d.hoverFailures.length
            },
            details: {
                mermaidErrors: d.mermaidErrors,
                brokenLinks: d.brokenLinks,
                metadataIssues: d.metadataIssues,
                hoverFailures: d.hoverFailures
            }
        };
        
        const json = JSON.stringify(report, null, 2);
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(() => {
                console.log('%c✅ Report copied to clipboard!', 'color: #16a34a; font-weight: bold;');
            }).catch(() => {
                console.log('Report JSON:', json);
            });
        } else {
            console.log('Report JSON:', json);
        }
        
        return report;
    };
    
    /**
     * Clear all tracked data
     */
    window.clearDebugData = function() {
        window.CODEWIKI_DEBUG.mermaidErrors = [];
        window.CODEWIKI_DEBUG.brokenLinks = [];
        window.CODEWIKI_DEBUG.metadataIssues = [];
        window.CODEWIKI_DEBUG.hoverFailures = [];
        window.CODEWIKI_DEBUG.navigationEvents = [];
        window.CODEWIKI_DEBUG.startTime = Date.now();
        console.log('%c🧹 Debug data cleared', 'color: #64748b;');
    };
    
    // ============================================================
    // KEYBOARD SHORTCUT
    // ============================================================
    
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+D to show debug report
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            window.showCodeWikiDebug();
        }
        
        // Ctrl+Shift+E to export report
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            window.exportDebugReport();
        }
    });
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    console.log(
        '%c[CodeWiki Debug] %cv' + window.CODEWIKI_DEBUG.version + ' loaded',
        'color: #2563eb; font-weight: bold;',
        'color: #64748b;'
    );
    console.log(
        '%c  Press Ctrl+Shift+D for reliability report',
        'color: #64748b; font-style: italic;'
    );
    console.log(
        '%c  Press Ctrl+Shift+E to export report as JSON',
        'color: #64748b; font-style: italic;'
    );
    
})();
