/**
 * Single source of truth for ELK leaf sizing and React Flow dimension fallbacks.
 * Pattern: openai-realtime-elkjs-tool — elkOptions (width) + ensureIds (per-node w/h)
 * + processLayoutedGraph(elkGraph, { width, height, groupWidth, groupHeight, padding }).
 *
 * Load before pipeline-diagram-to-elk.js in the browser. In Node, require this
 * module before diagramToElkInput, or it will be required lazily from pipeline-diagram-to-elk.js.
 */
(function (global) {
    'use strict';

    var DEFAULTS = {
        rootId: 'root',
        /** Default fixed leaf width (px); overridden by viewTune.elkLeafNodeWidth in the viewer. */
        leafNodeWidth: 96,
        leafMinWidth: 72,
        leafMaxWidth: 400,
        leafWidthStep: 4,
        leafPaddingHorizontal: 16,
        leafPaddingVertical: 18,
        leafLineHeight: 14,
        leafMinHeight: 36,
        charWidth: 7,
        groupLabelHeight: 28,
        groupMinWidth: 120,
        /** React Flow fallbacks when ELK omits size (mirrors hook passing height fallback). */
        reactFlowFallbackLeafHeight: 40,
        reactFlowGroupWidthFactor: 3,
        reactFlowGroupHeightFactor: 3,
        /** Uniform ELK compound inset (px): top/left/right/bottom; matches former lateral inset in pipeline-diagram-to-elk. */
        elkCompoundPaddingPx: 14,
    };

    function clampLeafWidthPx(x) {
        var v = Math.round(Number(x) || DEFAULTS.leafNodeWidth);
        v = Math.max(DEFAULTS.leafMinWidth, Math.min(DEFAULTS.leafMaxWidth, v));
        v = Math.round(v / DEFAULTS.leafWidthStep) * DEFAULTS.leafWidthStep;
        return v;
    }

    /**
     * Resolved leaf box width for ELK + SVG + RF (slider / viewTune in viewer).
     */
    function resolveLeafNodeWidthPx(globalObj) {
        var g = globalObj || global;
        var vt = g.viewTune;
        if (
            vt &&
            typeof vt.elkLeafNodeWidth === 'number' &&
            !isNaN(vt.elkLeafNodeWidth)
        ) {
            return clampLeafWidthPx(vt.elkLeafNodeWidth);
        }
        return clampLeafWidthPx(DEFAULTS.leafNodeWidth);
    }

    /**
     * Uniform padding between compound frame and children in ELK (elkjs target).
     */
    function getElkCompoundPaddingPx(globalObj) {
        void globalObj;
        var v = Math.round(Number(DEFAULTS.elkCompoundPaddingPx) || 14);
        return Math.max(4, Math.min(48, v));
    }

    /**
     * Profile passed to elkLaidOutToReactFlowElements (cf. processLayoutedGraph second arg).
     */
    function getReactFlowDimensionProfile(globalObj) {
        var w = resolveLeafNodeWidthPx(globalObj || global);
        var fh = DEFAULTS.reactFlowFallbackLeafHeight;
        var pad = getElkCompoundPaddingPx(globalObj || global);
        return {
            width: w,
            height: fh,
            groupWidth: w * DEFAULTS.reactFlowGroupWidthFactor,
            groupHeight: fh * DEFAULTS.reactFlowGroupHeightFactor,
            padding: pad,
        };
    }

    function linesForParagraph(para, maxChars) {
        var words = para.split(/\s+/).filter(function (w) {
            return w.length > 0;
        });
        if (words.length === 0) return 1;
        var lineCount = 0;
        var cur = 0;
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            while (w.length > maxChars) {
                if (cur > 0) {
                    lineCount++;
                    cur = 0;
                }
                lineCount++;
                w = w.substring(maxChars);
            }
            if (w.length === 0) continue;
            var need = w.length + (cur > 0 ? 1 : 0);
            if (cur + need <= maxChars) {
                cur += need;
            } else {
                lineCount++;
                cur = w.length;
            }
        }
        if (cur > 0) lineCount++;
        return Math.max(1, lineCount);
    }

    /** Fixed leaf width; height from wrapped label (ELK node box). */
    function estimateElkLeafSize(label, options) {
        var o = options || {};
        var text = String(label != null ? label : '').trim() || '?';
        var fixedW =
            o.leafNodeWidth != null ? o.leafNodeWidth : resolveLeafNodeWidthPx(global);
        var minW =
            o.leafMinWidth != null ? o.leafMinWidth : DEFAULTS.leafMinWidth;
        fixedW = Math.max(minW, fixedW);
        var cw = o.charWidth != null ? o.charWidth : DEFAULTS.charWidth;
        var padH =
            o.leafPaddingHorizontal != null
                ? o.leafPaddingHorizontal
                : DEFAULTS.leafPaddingHorizontal;
        var padV =
            o.leafPaddingVertical != null
                ? o.leafPaddingVertical
                : DEFAULTS.leafPaddingVertical;
        var lineH =
            o.leafLineHeight != null ? o.leafLineHeight : DEFAULTS.leafLineHeight;
        var minH =
            o.leafMinHeight != null ? o.leafMinHeight : DEFAULTS.leafMinHeight;
        var innerW = Math.max(24, fixedW - padH);
        var maxChars = Math.max(4, Math.floor(innerW / cw));

        var paras = text.split(/\n/);
        var totalLines = 0;
        for (var pi = 0; pi < paras.length; pi++) {
            var para = paras[pi];
            if (para.length === 0) {
                totalLines++;
                continue;
            }
            totalLines += linesForParagraph(para, maxChars);
        }
        var h = padV + totalLines * lineH;
        h = Math.max(minH, Math.ceil(h));
        return { width: fixedW, height: h, text: text };
    }

    function estimateElkGroupLabelSize(label, options) {
        var o = options || {};
        var text = String(label != null ? label : '').trim() || '?';
        var minW =
            o.groupMinWidth != null ? o.groupMinWidth : DEFAULTS.groupMinWidth;
        var cw = o.charWidth != null ? o.charWidth : DEFAULTS.charWidth;
        var pad = 32;
        var w = Math.max(minW, Math.min(360, text.length * cw + pad));
        var h =
            o.groupLabelHeight != null
                ? o.groupLabelHeight
                : DEFAULTS.groupLabelHeight;
        return { width: w, height: h, text: text };
    }

    var api = {
        DEFAULTS: DEFAULTS,
        clampLeafWidthPx: clampLeafWidthPx,
        resolveLeafNodeWidthPx: resolveLeafNodeWidthPx,
        getElkCompoundPaddingPx: getElkCompoundPaddingPx,
        getReactFlowDimensionProfile: getReactFlowDimensionProfile,
        estimateElkLeafSize: estimateElkLeafSize,
        estimateElkGroupLabelSize: estimateElkGroupLabelSize,
    };

    global.atelierElkNodeDimensions = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
