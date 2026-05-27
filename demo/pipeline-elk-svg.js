/**
 * R5: ELK laid-out graph → SVG (preview before React Flow).
 * Depends on global ELK (elk.bundled.js), diagramToElkInput.
 */
(function (global) {
    'use strict';

    function escapeXml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** For XHTML inside foreignObject (node labels): keep text inside the ELK rect. */
    function escapeHtmlText(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function sectionToPathD(section, ox, oy) {
        if (!section) return '';
        var pts = [];
        if (section.startPoint) {
            pts.push({
                x: section.startPoint.x + ox,
                y: section.startPoint.y + oy,
            });
        }
        var bends = section.bendPoints || [];
        for (var b = 0; b < bends.length; b++) {
            var bp = bends[b];
            pts.push({ x: bp.x + ox, y: bp.y + oy });
        }
        if (section.endPoint) {
            pts.push({
                x: section.endPoint.x + ox,
                y: section.endPoint.y + oy,
            });
        }
        if (pts.length < 2) return '';
        var d = 'M ' + pts[0].x + ' ' + pts[0].y;
        for (var i = 1; i < pts.length; i++) {
            d += ' L ' + pts[i].x + ' ' + pts[i].y;
        }
        return d;
    }

    /** Collect polyline points for an ELK edge section (absolute coords). */
    function sectionPoints(section, ox, oy) {
        var pts = [];
        if (!section) return pts;
        if (section.startPoint) {
            pts.push({
                x: section.startPoint.x + ox,
                y: section.startPoint.y + oy,
            });
        }
        var bends = section.bendPoints || [];
        for (var b = 0; b < bends.length; b++) {
            var bp = bends[b];
            pts.push({ x: bp.x + ox, y: bp.y + oy });
        }
        if (section.endPoint) {
            pts.push({
                x: section.endPoint.x + ox,
                y: section.endPoint.y + oy,
            });
        }
        return pts;
    }

    function svgColorWithAlpha(hex, alpha) {
        if (alpha <= 0) return 'transparent';
        if (!hex || typeof hex !== 'string') return 'transparent';
        var h = hex.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(h)) return h;
        var r = parseInt(h.slice(1, 3), 16);
        var g = parseInt(h.slice(3, 5), 16);
        var b = parseInt(h.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    /** system_design_legend — minimal architectural roles (README / static SVG). */
    var SYSTEM_DESIGN_ROLES = {
        actor: {
            label: 'Actor / Client',
            fill: '#FFFFFF',
            border: '#9AA0A6',
            text: '#0f172a',
            nodeMode: 'border',
        },
        domain_group: {
            label: 'Domain / Subsystem Group',
            fill: '#E3F2FD',
            border: '#64B5F6',
            text: '#0f172a',
            groupFillAlpha: 0.5,
            nodeMode: 'none',
        },
        component: {
            label: 'Component',
            fill: '#FFFFFF',
            border: '#5F6368',
            text: '#0f172a',
            nodeMode: 'border',
        },
        data_store: {
            label: 'Data Store / Data Channel',
            fill: '#FFF8E1',
            border: '#F9AB00',
            text: '#5f4339',
            nodeMode: 'border',
        },
        external_dependency: {
            label: 'External Dependency',
            fill: '#FFEBEE',
            border: '#E57373',
            text: '#7f1d1d',
            nodeMode: 'border',
        },
        system_boundary: {
            label: 'System Boundary',
            fill: '#F1F8E9',
            border: '#7CB342',
            text: '#0f172a',
            groupFillAlpha: 0.45,
            nodeMode: 'none',
        },
        execution_group: {
            label: 'Execution Group',
            fill: '#F6F6F6',
            border: '#BDBDBD',
            text: '#0f172a',
            groupFillAlpha: 0.55,
            nodeMode: 'none',
        },
    };

    var SYSTEM_DESIGN_LEGEND_ORDER = [
        'actor',
        'domain_group',
        'component',
        'data_store',
        'external_dependency',
        'system_boundary',
        'execution_group',
    ];

    /** Legacy Cortex-style roles (viewer parity). */
    var RF_SEMANTIC_NODE_STYLES = {
        stakeholder_surface: {
            label: 'Stakeholder work surfaces',
            background: '#eff6ff',
            border: '#2563eb',
            text: '#1e3a8a',
        },
        external_data_source: {
            label: 'External data sources',
            background: '#fff7ed',
            border: '#ea580c',
            text: '#7c2d12',
        },
        control_spine: {
            label: 'Control spine / governance',
            background: '#f5f3ff',
            border: '#7c3aed',
            text: '#4c1d95',
        },
        neutral: {
            label: 'Functional domains / neutral modules',
            background: '#f8fafc',
            border: '#64748b',
            text: '#334155',
        },
        user: { label: 'Users / roles', background: '#eff6ff', border: '#2563eb', text: '#1e3a8a' },
        entry: { label: 'Entrypoints / data', background: '#fff7ed', border: '#f97316', text: '#7c2d12' },
        module: {
            label: 'Drill-down modules',
            background: '#f5f3ff',
            border: '#7c3aed',
            text: '#3b0764',
        },
        external: { label: 'External systems', background: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
        agent: { label: 'Agents / services', background: '#ecfdf5', border: '#059669', text: '#064e3b' },
        component: {
            label: 'Other components',
            background: '#f8fafc',
            border: '#64748b',
            text: '#0f172a',
        },
    };

    var RF_SEMANTIC_LEGEND_ORDER = [
        'stakeholder_surface',
        'external_data_source',
        'control_spine',
        'neutral',
        'user',
        'entry',
        'external',
        'agent',
        'component',
    ];

    /** Gap between diagram content box and legend panel (legend sits outside arch). */
    var SVG_LEGEND_GAP = 20;
    var SVG_LEGEND_FONT_PX = 11;
    var SVG_LEGEND_SWATCH = 12;
    var SVG_LEGEND_ROW_H = 18;
    var SVG_LEGEND_PAD_X = 12;
    var SVG_LEGEND_PAD_Y = 10;
    var SVG_LEGEND_TITLE_H = 20;

    function svgSemanticLegendEnabled(diagram) {
        if (!diagram || typeof diagram !== 'object') return false;
        if (diagram.legend === true) return true;
        if (diagram.legend && diagram.legend.enabled === true) return true;
        return false;
    }

    function svgLegendPalette(diagram) {
        var legend = diagram && diagram.legend && typeof diagram.legend === 'object' ? diagram.legend : {};
        if (legend.palette === 'system_design' || legend.schema === 'system_design') {
            return 'system_design';
        }
        return 'legacy';
    }

    function svgRoleStyleMap(diagram) {
        return svgLegendPalette(diagram) === 'system_design' ? SYSTEM_DESIGN_ROLES : RF_SEMANTIC_NODE_STYLES;
    }

    function svgLegendRoleOrder(diagram) {
        return svgLegendPalette(diagram) === 'system_design'
            ? SYSTEM_DESIGN_LEGEND_ORDER
            : RF_SEMANTIC_LEGEND_ORDER;
    }

    function svgNormaliseSystemDesignRole(role) {
        if (role == null) return null;
        var r = String(role).trim().toLowerCase().replace(/-/g, '_');
        if (!r) return null;
        if (r === 'client' || r === 'caller' || r === 'persona' || r === 'human') return 'actor';
        if (r === 'user' || r === 'users' || r === 'role') return 'actor';
        if (
            r === 'domain' ||
            r === 'subsystem' ||
            r === 'subsystem_group' ||
            r === 'bounded_context' ||
            r === 'feature_area'
        ) {
            return 'domain_group';
        }
        if (r === 'module' || r === 'service' || r === 'api' || r === 'worker' || r === 'processor') {
            return 'component';
        }
        if (
            r === 'data' ||
            r === 'database' ||
            r === 'cache' ||
            r === 'queue' ||
            r === 'store' ||
            r === 'data_store' ||
            r === 'data_channel'
        ) {
            return 'data_store';
        }
        if (
            r === 'external' ||
            r === 'external_system' ||
            r === 'vendor' ||
            r === 'integration' ||
            r === 'dependency' ||
            r === 'external_dependency'
        ) {
            return 'external_dependency';
        }
        if (r === 'system' || r === 'product' || r === 'system_boundary') return 'system_boundary';
        if (r === 'runtime' || r === 'execution' || r === 'execution_group') return 'execution_group';
        return SYSTEM_DESIGN_ROLES[r] ? r : null;
    }

    function svgNormaliseSemanticRole(role) {
        if (role == null) return null;
        var r = String(role).trim().toLowerCase();
        if (!r) return null;
        if (r === 'stakeholder' || r === 'stakeholders' || r === 'stakeholder_surface') {
            return 'stakeholder_surface';
        }
        if (
            r === 'data_source' ||
            r === 'external_data' ||
            r === 'external_data_source' ||
            r === 'external-data-source'
        ) {
            return 'external_data_source';
        }
        if (r === 'control' || r === 'control_spine' || r === 'governance_spine') {
            return 'control_spine';
        }
        if (r === 'gray' || r === 'grey' || r === 'neutral_gray' || r === 'neutral') return 'neutral';
        if (r === 'persona' || r === 'role' || r === 'human' || r === 'user') return 'user';
        if (r === 'entry') return 'entry';
        if (r === 'module') return 'module';
        if (r === 'external_system' || r === 'vendor' || r === 'integration' || r === 'external') {
            return 'external';
        }
        if (r === 'service' || r === 'ai_agent' || r === 'system_agent' || r === 'agent') {
            return 'agent';
        }
        if (r === 'workbench' || r === 'view' || r === 'task' || r === 'component') return 'component';
        return RF_SEMANTIC_NODE_STYLES[r] ? r : null;
    }

    function svgInferSemanticRole(nodeId, raw, diagram) {
        var explicit =
            raw &&
            (raw.semanticRole != null
                ? raw.semanticRole
                : raw.role != null
                  ? raw.role
                  : raw.kind != null
                    ? raw.kind
                    : raw.category);
        if (diagram && svgLegendPalette(diagram) === 'system_design') {
            var sd = svgNormaliseSystemDesignRole(explicit);
            if (sd) return sd;
            var id = String(nodeId || '').toLowerCase();
            if (id.indexOf('user_') === 0 || id.indexOf('actor_') === 0 || id.indexOf('client_') === 0) {
                return 'actor';
            }
            if (
                id.indexOf('data_store') >= 0 ||
                id.indexOf('_store') >= 0 ||
                id.indexOf('_cache') >= 0 ||
                id.indexOf('_queue') >= 0
            ) {
                return 'data_store';
            }
            if (
                id.indexOf('llm_') === 0 ||
                id.indexOf('external_') === 0 ||
                id.indexOf('ext_') === 0 ||
                (raw && String(raw.type || '').toLowerCase() === 'external' && id.indexOf('user_') !== 0)
            ) {
                return 'external_dependency';
            }
            if (raw && String(raw.type || '').toLowerCase() === 'module') return 'component';
            return 'component';
        }

        var role = svgNormaliseSemanticRole(explicit);
        if (role) return role;
        var id = String(nodeId || '').toLowerCase();
        var type = raw && raw.type != null ? String(raw.type).toLowerCase() : '';
        if (type === 'external' || id.indexOf('ext_') === 0) return 'external';
        if (type === 'module') return 'module';
        if (id.indexOf('role_') === 0 || id.indexOf('user_') === 0) return 'user';
        if (id.indexOf('entry_') === 0 || id.indexOf('tile_wb_') === 0) return 'entry';
        if (id.indexOf('agent') >= 0 || id.indexOf('orchestrator') >= 0 || id.indexOf('sentinel') >= 0) {
            return 'agent';
        }
        return 'component';
    }

    function svgGroupMetaById(diagram) {
        var out = Object.create(null);
        var groups = diagram && Array.isArray(diagram.groups) ? diagram.groups : [];
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            if (g && g.id != null) out[String(g.id)] = g;
        }
        return out;
    }

    function svgInferGroupRole(groupId, diagram) {
        var raw = svgGroupMetaById(diagram)[groupId];
        if (!diagram || svgLegendPalette(diagram) !== 'system_design') return null;
        var explicit =
            raw &&
            (raw.semanticRole != null
                ? raw.semanticRole
                : raw.role != null
                  ? raw.role
                  : null);
        var sd = svgNormaliseSystemDesignRole(explicit);
        if (sd) return sd;
        return 'domain_group';
    }

    function svgLegendLabels(diagram) {
        var out = Object.create(null);
        var legend = diagram && diagram.legend && typeof diagram.legend === 'object' ? diagram.legend : {};
        var roles = legend.roles && typeof legend.roles === 'object' ? legend.roles : {};
        var palette = svgLegendPalette(diagram);
        Object.keys(roles).forEach(function (rawRole) {
            var role =
                palette === 'system_design'
                    ? svgNormaliseSystemDesignRole(rawRole)
                    : svgNormaliseSemanticRole(rawRole);
            var label = roles[rawRole];
            if (role && typeof label === 'string' && label.trim()) out[role] = label.trim();
        });
        return out;
    }

    function svgLegendAllowsRole(role, legendLabels) {
        if (!role) return false;
        var keys = legendLabels && typeof legendLabels === 'object' ? Object.keys(legendLabels) : [];
        if (!keys.length) return true;
        return !!legendLabels[role];
    }

    /** Paint nodes/groups by role; legend panel only lists legend.roles. */
    function svgShouldApplyRoleStyle(role, diagram, legendLabels) {
        if (!role) return false;
        if (svgLegendPalette(diagram) === 'system_design') {
            return !!svgRoleStyleMap(diagram)[role];
        }
        return svgLegendAllowsRole(role, legendLabels);
    }

    function svgNodeMetaById(diagram) {
        var out = Object.create(null);
        var nodes = diagram && Array.isArray(diagram.nodes) ? diagram.nodes : [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n && n.id != null) out[String(n.id)] = n;
        }
        return out;
    }

    function svgEstimateTextWidthPx(text, fontPx, fontWeight) {
        var t = String(text == null ? '' : text);
        var w = 0;
        var bold = fontWeight >= 600;
        for (var i = 0; i < t.length; i++) {
            var ch = t.charAt(i);
            if (ch === ' ') w += 3.4;
            else if ('WMmw@'.indexOf(ch) >= 0) w += (bold ? 9.5 : 8.5);
            else if ('iljtfr'.indexOf(ch) >= 0) w += (bold ? 4.5 : 4);
            else w += bold ? 7.8 : 6.8;
        }
        return w;
    }

    function svgBuildLegendRows(diagram) {
        if (!svgSemanticLegendEnabled(diagram)) return [];
        var metaById = svgNodeMetaById(diagram);
        var legendLabels = svgLegendLabels(diagram);
        var styleMap = svgRoleStyleMap(diagram);
        var present = Object.create(null);
        Object.keys(metaById).forEach(function (id) {
            var role = svgInferSemanticRole(id, metaById[id], diagram);
            if (!role || !styleMap[role]) return;
            if (!svgLegendAllowsRole(role, legendLabels)) return;
            present[role] = true;
        });
        if (svgLegendPalette(diagram) === 'system_design') {
            var groupById = svgGroupMetaById(diagram);
            Object.keys(groupById).forEach(function (gid) {
                var gRole = svgInferGroupRole(gid, diagram);
                if (!gRole || !styleMap[gRole]) return;
                if (!svgLegendAllowsRole(gRole, legendLabels)) return;
                present[gRole] = true;
            });
        } else {
            present.module = false;
            if (present.neutral) present.component = false;
        }
        var rows = [];
        svgLegendRoleOrder(diagram).forEach(function (role) {
            if (!present[role]) return;
            var style = styleMap[role];
            rows.push({
                role: role,
                label: legendLabels[role] || style.label,
                background: style.fill || style.background,
                border: style.border,
            });
        });
        return rows;
    }

    function svgResolveNodePaint(role, style, diagram) {
        if (!style) {
            return { fill: '#ffffff', stroke: '#475569', text: '#0f172a', strokeWidth: 1 };
        }
        if (svgLegendPalette(diagram) === 'system_design') {
            var mode = style.nodeMode || 'border';
            if (mode === 'fill') {
                return {
                    fill: style.fill,
                    stroke: style.border,
                    text: style.text,
                    strokeWidth: 1.5,
                };
            }
            return {
                fill: '#ffffff',
                stroke: style.border,
                text: style.text,
                strokeWidth: 1.5,
            };
        }
        return {
            fill: style.background,
            stroke: style.border,
            text: style.text,
            strokeWidth: 1,
        };
    }

    function svgResolveGroupPaint(groupId, diagram) {
        var role = svgInferGroupRole(groupId, diagram);
        var legendLabels = svgLegendLabels(diagram);
        if (!role || !svgShouldApplyRoleStyle(role, diagram, legendLabels)) {
            return {
                fill: SVG_GROUP_FILL,
                stroke: SVG_GROUP_STROKE,
                strokeOpacity: SVG_GROUP_STROKE_OPACITY,
                dash: '6 4',
                strokeWidth: 1,
            };
        }
        var style = SYSTEM_DESIGN_ROLES[role];
        if (!style) {
            return {
                fill: SVG_GROUP_FILL,
                stroke: SVG_GROUP_STROKE,
                strokeOpacity: SVG_GROUP_STROKE_OPACITY,
                dash: '6 4',
                strokeWidth: 1,
            };
        }
        var alpha =
            typeof style.groupFillAlpha === 'number' && !isNaN(style.groupFillAlpha)
                ? style.groupFillAlpha
                : 0.5;
        return {
            fill: svgColorWithAlpha(style.fill, alpha),
            stroke: style.border,
            strokeOpacity: 1,
            dash: '',
            strokeWidth: 1.5,
        };
    }

    function svgSemanticLegendLayout(diagram) {
        var rows = svgBuildLegendRows(diagram);
        if (!rows.length) return null;
        var maxLabelW = 0;
        for (var i = 0; i < rows.length; i++) {
            maxLabelW = Math.max(maxLabelW, svgEstimateTextWidthPx(rows[i].label, SVG_LEGEND_FONT_PX, 400));
        }
        var w = Math.ceil(
            SVG_LEGEND_PAD_X * 2 + SVG_LEGEND_SWATCH + 6 + maxLabelW
        );
        var h = SVG_LEGEND_PAD_Y * 2 + SVG_LEGEND_TITLE_H + rows.length * SVG_LEGEND_ROW_H;
        return { rows: rows, w: w, h: h };
    }

    function svgSemanticLegendMarkup(layout, x, y) {
        if (!layout || !layout.rows.length) return '';
        var titleY = y + SVG_LEGEND_PAD_Y + SVG_LEGEND_FONT_PX;
        var body =
            '<g class="elk-layer-legend" data-testid="atelier-svg-semantic-legend">' +
            '<rect x="' +
            x +
            '" y="' +
            y +
            '" width="' +
            layout.w +
            '" height="' +
            layout.h +
            '" rx="10" fill="rgba(255,255,255,0.94)" stroke="rgba(148,163,184,0.55)" stroke-width="1"/>' +
            '<text x="' +
            (x + SVG_LEGEND_PAD_X) +
            '" y="' +
            titleY +
            '" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="' +
            SVG_LEGEND_FONT_PX +
            '" font-weight="700" fill="#0f172a">Legend</text>';
        for (var r = 0; r < layout.rows.length; r++) {
            var row = layout.rows[r];
            var rowY = y + SVG_LEGEND_PAD_Y + SVG_LEGEND_TITLE_H + r * SVG_LEGEND_ROW_H;
            var swX = x + SVG_LEGEND_PAD_X;
            var swY = rowY + 3;
            var textX = swX + SVG_LEGEND_SWATCH + 6;
            var textY = rowY + SVG_LEGEND_FONT_PX + 2;
            body +=
                '<rect x="' +
                swX +
                '" y="' +
                swY +
                '" width="' +
                SVG_LEGEND_SWATCH +
                '" height="' +
                SVG_LEGEND_SWATCH +
                '" rx="3" fill="' +
                row.background +
                '" stroke="' +
                row.border +
                '" stroke-width="1.5"/>' +
                '<text x="' +
                textX +
                '" y="' +
                textY +
                '" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="' +
                SVG_LEGEND_FONT_PX +
                '" font-weight="400" fill="#334155">' +
                escapeXml(row.label) +
                '</text>';
        }
        return body + '</g>';
    }

    /** Node label text — never tied to semantic role colors. */
    var SVG_LEAF_TEXT_COLOR = '#0f172a';

    /** Match reactflow-r6.mjs ElkGroupNode outside-label pill (README / static export). */
    var SVG_GROUP_LABEL_FONT_PX = 14;
    var SVG_GROUP_LABEL_PAD_X = 8;
    var SVG_GROUP_LABEL_PAD_Y = 2;
    var SVG_GROUP_LABEL_GAP_ABOVE = 6;
    var SVG_GROUP_LABEL_LINE_H = SVG_GROUP_LABEL_FONT_PX + 2 * SVG_GROUP_LABEL_PAD_Y;
    /** Uniform inset from frame edge to diagram + logo block (all sides). */
    var SVG_FRAME_PAD = 28;
    /** Extra inset for edge strokes and arrow markers outside path endpoints. */
    var SVG_EDGE_BOUNDS_PAD = 14;
    var ATELIER_LOGO_DISPLAY_H = 48;
    var ATELIER_LOGO_RADIUS = 8;
    var ATELIER_LOGO_BORDER = '#E4E4E4';
    /** Square ink-blot mark (demo/assets/atelier-logo.png). */
    var ATELIER_LOGO_ASPECT = 1;

    function resolveAtelierLogoDataUri() {
        if (global.ATELIER_LOGO_DATA_URI) return global.ATELIER_LOGO_DATA_URI;
        try {
            var fs = require('fs');
            var path = require('path');
            var logoPath = path.join(__dirname, 'assets', 'atelier-logo.png');
            if (fs.existsSync(logoPath)) {
                return (
                    'data:image/png;base64,' +
                    fs.readFileSync(logoPath).toString('base64')
                );
            }
        } catch (e) {
            /* browser bundle — no fs */
        }
        return null;
    }

    function atelierLogoMarkup(logoUri, logoX, logoY) {
        if (!logoUri) return '';
        var logoH = ATELIER_LOGO_DISPLAY_H;
        var logoW = logoH * ATELIER_LOGO_ASPECT;
        var clipId = 'atelier-logo-clip';
        return (
            '<g class="elk-layer-brand" aria-label="Atelier">' +
            '<defs><clipPath id="' +
            clipId +
            '"><rect x="' +
            logoX +
            '" y="' +
            logoY +
            '" width="' +
            logoW +
            '" height="' +
            logoH +
            '" rx="' +
            ATELIER_LOGO_RADIUS +
            '" ry="' +
            ATELIER_LOGO_RADIUS +
            '"/></clipPath></defs>' +
            '<image href="' +
            escapeXml(logoUri) +
            '" x="' +
            logoX +
            '" y="' +
            logoY +
            '" width="' +
            logoW +
            '" height="' +
            logoH +
            '" clip-path="url(#' +
            clipId +
            ')" preserveAspectRatio="xMidYMid slice" opacity="0.95"/>' +
            '<rect x="' +
            logoX +
            '" y="' +
            logoY +
            '" width="' +
            logoW +
            '" height="' +
            logoH +
            '" rx="' +
            ATELIER_LOGO_RADIUS +
            '" ry="' +
            ATELIER_LOGO_RADIUS +
            '" fill="none" stroke="' +
            ATELIER_LOGO_BORDER +
            '" stroke-width="1"/></g>'
        );
    }
    var SVG_GROUP_FILL = 'rgba(241, 245, 249, 0.4)';
    var SVG_GROUP_STROKE = '#64748b';
    var SVG_GROUP_STROKE_OPACITY = 0.55;

    /** Pill width from label text only (never capped to group width — long titles must fit). */
    function pillWidthForLabel(text) {
        var t = String(text == null ? '' : text);
        var pre =
            global.atelierPillWidthByLabel &&
            typeof global.atelierPillWidthByLabel === 'object' &&
            global.atelierPillWidthByLabel[t];
        if (typeof pre === 'number' && !isNaN(pre)) {
            return Math.max(32, Math.ceil(pre) + 2 * SVG_GROUP_LABEL_PAD_X + 4);
        }
        var w = 0;
        for (var i = 0; i < t.length; i++) {
            var ch = t.charAt(i);
            if (ch === ' ') w += 3.8;
            else if ('WMmw@'.indexOf(ch) >= 0) w += 9.2;
            else if ('iljtfr'.indexOf(ch) >= 0) w += 4.2;
            else w += 7.4;
        }
        return Math.max(32, Math.ceil(w) + 2 * SVG_GROUP_LABEL_PAD_X + 4);
    }

    var ARROW_MARKER_DEF =
        '<marker id="elk-edge-arrow" viewBox="0 0 10 10" refX="9.5" refY="5" ' +
        'markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">' +
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" stroke="none"/></marker>';

    /**
     * @param {object} laidOutGraph - output of elk.layout (mutated graph with x,y,width,height,sections)
     * @param {{ groupLabelsOutside?: boolean, diagram?: object }} [options]
     */
    function elkLaidOutGraphToSvgMarkup(laidOutGraph, options) {
        options = options || {};
        var groupLabelsOutside = options.groupLabelsOutside !== false;
        var diagram = options.diagram || null;
        var legendEnabled = svgSemanticLegendEnabled(diagram);
        var metaById = legendEnabled ? svgNodeMetaById(diagram) : Object.create(null);
        var legendLabels = legendEnabled ? svgLegendLabels(diagram) : Object.create(null);
        var acc = { nodes: [], edgePlacements: [], groupPills: [] };

        function walk(node, parentId, px, py) {
            if (!node) return;
            var ax = px + (node.x || 0);
            var ay = py + (node.y || 0);
            if (parentId != null && node.width != null && node.height != null) {
                acc.nodes.push({
                    id: String(node.id),
                    x: ax,
                    y: ay,
                    w: node.width,
                    h: node.height,
                    labels: node.labels || [],
                    compound: !!(node.children && node.children.length),
                });
            }
            var edges = node.edges || [];
            for (var e = 0; e < edges.length; e++) {
                acc.edgePlacements.push({ edge: edges[e], ox: ax, oy: ay });
            }
            var ch = node.children || [];
            for (var c = 0; c < ch.length; c++) walk(ch[c], node.id, ax, ay);
        }

        walk(laidOutGraph, null, 0, 0);

        acc.nodes.sort(function (a, b) {
            return b.w * b.h - a.w * a.h;
        });

        var gw = laidOutGraph.width || 400;
        var gh = laidOutGraph.height || 300;
        var logoUri = options.logoDataUri || resolveAtelierLogoDataUri();

        var compoundMarkup = '';
        var leafMarkup = '';
        var pillMarkup = '';
        var minCx = Infinity;
        var minCy = Infinity;
        var maxCx = -Infinity;
        var maxCy = -Infinity;

        function bumpContentBounds(x0, y0, x1, y1) {
            if (x0 < minCx) minCx = x0;
            if (y0 < minCy) minCy = y0;
            if (x1 > maxCx) maxCx = x1;
            if (y1 > maxCy) maxCy = y1;
        }

        function bumpPointBounds(x, y, pad) {
            var p = pad == null ? 0 : pad;
            bumpContentBounds(x - p, y - p, x + p, y + p);
        }

        var edgePaths = '';
        for (var i = 0; i < acc.edgePlacements.length; i++) {
            var ep = acc.edgePlacements[i];
            var edge = ep.edge;
            if (!edge) continue;
            var secs = edge.sections || [];
            for (var s = 0; s < secs.length; s++) {
                var sec = secs[s];
                var pts = sectionPoints(sec, ep.ox, ep.oy);
                for (var pi = 0; pi < pts.length; pi++) {
                    bumpPointBounds(pts[pi].x, pts[pi].y, SVG_EDGE_BOUNDS_PAD);
                }
                var d = sectionToPathD(sec, ep.ox, ep.oy);
                if (!d) continue;
                edgePaths +=
                    '<path d="' +
                    d +
                    '" fill="none" stroke="#64748b" stroke-width="1.25" stroke-linejoin="round" ' +
                    'marker-end="url(#elk-edge-arrow)"/>';
            }
        }

        for (var n = 0; n < acc.nodes.length; n++) {
            var nn = acc.nodes[n];
            var lab =
                nn.labels[0] && nn.labels[0].text != null
                    ? String(nn.labels[0].text)
                    : nn.id;

            bumpContentBounds(nn.x, nn.y, nn.x + nn.w, nn.y + nn.h);

            if (nn.compound) {
                var groupPaint =
                    legendEnabled && svgLegendPalette(diagram) === 'system_design'
                        ? svgResolveGroupPaint(nn.id, diagram)
                        : {
                              fill: SVG_GROUP_FILL,
                              stroke: SVG_GROUP_STROKE,
                              strokeOpacity: SVG_GROUP_STROKE_OPACITY,
                              dash: '6 4',
                              strokeWidth: 1,
                          };
                var groupDashAttr = groupPaint.dash
                    ? ' stroke-dasharray="' + groupPaint.dash + '"'
                    : '';
                compoundMarkup +=
                    '<g class="elk-group" data-elk-id="' +
                    escapeXml(nn.id) +
                    '">' +
                    '<rect x="' +
                    nn.x +
                    '" y="' +
                    nn.y +
                    '" width="' +
                    nn.w +
                    '" height="' +
                    nn.h +
                    '" rx="8" fill="' +
                    groupPaint.fill +
                    '" stroke="' +
                    groupPaint.stroke +
                    '" stroke-opacity="' +
                    groupPaint.strokeOpacity +
                    '" stroke-width="' +
                    groupPaint.strokeWidth +
                    '"' +
                    groupDashAttr +
                    '/>' +
                    '</g>';

                if (groupLabelsOutside && lab) {
                    var pillW = pillWidthForLabel(lab);
                    var pillH = SVG_GROUP_LABEL_LINE_H;
                    var pillX = nn.x;
                    var pillY = nn.y - pillH - SVG_GROUP_LABEL_GAP_ABOVE;
                    bumpContentBounds(pillX, pillY, pillX + pillW, pillY + pillH);
                    var textX = pillX + SVG_GROUP_LABEL_PAD_X;
                    var textY = pillY + SVG_GROUP_LABEL_PAD_Y + SVG_GROUP_LABEL_FONT_PX * 0.82;
                    var clipId = 'pill-clip-' + String(nn.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                    pillMarkup +=
                        '<g class="elk-group-pill" data-elk-id="' +
                        escapeXml(nn.id) +
                        '-label">' +
                        '<defs><clipPath id="' +
                        clipId +
                        '"><rect x="' +
                        pillX +
                        '" y="' +
                        pillY +
                        '" width="' +
                        pillW +
                        '" height="' +
                        pillH +
                        '" rx="4"/></clipPath></defs>' +
                        '<rect x="' +
                        pillX +
                        '" y="' +
                        pillY +
                        '" width="' +
                        pillW +
                        '" height="' +
                        pillH +
                        '" rx="4" fill="rgb(241, 245, 249)" stroke="#64748b" stroke-opacity="0.42" stroke-width="1"/>' +
                        '<text x="' +
                        textX +
                        '" y="' +
                        textY +
                        '" clip-path="url(#' +
                        clipId +
                        ')" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="' +
                        SVG_GROUP_LABEL_FONT_PX +
                        '" font-weight="600" fill="#334155">' +
                        escapeXml(lab) +
                        '</text></g>';
                }
            } else {
                var leafFill = '#ffffff';
                var leafStroke = '#475569';
                var leafText = SVG_LEAF_TEXT_COLOR;
                var leafStrokeW = 1;
                if (legendEnabled) {
                    var semanticRole = svgInferSemanticRole(nn.id, metaById[nn.id], diagram);
                    if (svgShouldApplyRoleStyle(semanticRole, diagram, legendLabels)) {
                        var sem = svgRoleStyleMap(diagram)[semanticRole];
                        if (sem) {
                            var paint = svgResolveNodePaint(semanticRole, sem, diagram);
                            leafFill = paint.fill;
                            leafStroke = paint.stroke;
                            leafStrokeW = paint.strokeWidth || 1.5;
                        }
                    }
                }
                var foStyle =
                    'box-sizing:border-box;width:100%;height:100%;padding:8px;margin:0;' +
                    'font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;line-height:1.25;' +
                    'color:' +
                    leafText +
                    ';word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;' +
                    'overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;';
                leafMarkup +=
                    '<g class="elk-node" data-elk-id="' +
                    escapeXml(nn.id) +
                    '">' +
                    '<rect x="' +
                    nn.x +
                    '" y="' +
                    nn.y +
                    '" width="' +
                    nn.w +
                    '" height="' +
                    nn.h +
                    '" rx="6" fill="' +
                    leafFill +
                    '" stroke="' +
                    leafStroke +
                    '" stroke-width="' +
                    leafStrokeW +
                    '"/>' +
                    '<foreignObject x="' +
                    nn.x +
                    '" y="' +
                    nn.y +
                    '" width="' +
                    nn.w +
                    '" height="' +
                    nn.h +
                    '">' +
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' +
                    foStyle +
                    '">' +
                    escapeHtmlText(lab) +
                    '</div></foreignObject></g>';
            }
        }

        if (minCx === Infinity) {
            minCx = 0;
            minCy = 0;
            maxCx = gw;
            maxCy = gh;
        }

        var blockMinX = minCx;
        var blockMinY = minCy;
        var blockMaxX = maxCx;
        var blockMaxY = maxCy;

        var logoW = logoUri ? ATELIER_LOGO_DISPLAY_H * ATELIER_LOGO_ASPECT : 0;
        var logoX = minCx;
        var logoY = maxCy - ATELIER_LOGO_DISPLAY_H;
        var brandMarkup = atelierLogoMarkup(logoUri, logoX, logoY);
        if (logoUri) {
            blockMaxX = Math.max(blockMaxX, logoX + logoW);
            blockMaxY = Math.max(blockMaxY, logoY + ATELIER_LOGO_DISPLAY_H);
        }

        var legendLayout = svgSemanticLegendLayout(diagram);
        var legendMarkup = '';
        if (legendLayout) {
            var legendX = minCx + (logoUri ? logoW + SVG_LEGEND_GAP : 0);
            var legendY = maxCy - legendLayout.h;
            blockMaxX = Math.max(blockMaxX, legendX + legendLayout.w);
            blockMinY = Math.min(blockMinY, legendY);
            legendMarkup = svgSemanticLegendMarkup(legendLayout, legendX, legendY);
        }

        var vbX = blockMinX - SVG_FRAME_PAD;
        var vbY = blockMinY - SVG_FRAME_PAD;
        var vbW = blockMaxX - blockMinX + 2 * SVG_FRAME_PAD;
        var vbH = blockMaxY - blockMinY + 2 * SVG_FRAME_PAD;

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' +
            vbW +
            '" height="' +
            vbH +
            '" viewBox="' +
            vbX +
            ' ' +
            vbY +
            ' ' +
            vbW +
            ' ' +
            vbH +
            '">' +
            '<rect class="elk-svg-bg" x="' +
            vbX +
            '" y="' +
            vbY +
            '" width="' +
            vbW +
            '" height="' +
            vbH +
            '" fill="#fafafa"/>' +
            '<defs>' +
            ARROW_MARKER_DEF +
            '</defs>' +
            '<g class="elk-layer-groups">' +
            compoundMarkup +
            '</g><g class="elk-layer-leaves">' +
            leafMarkup +
            '</g><g class="elk-layer-edges" fill="none" stroke-linecap="round">' +
            edgePaths +
            '</g><g class="elk-layer-group-pills">' +
            pillMarkup +
            '</g>' +
            legendMarkup +
            brandMarkup +
            '</svg>'
        );
    }

    /**
     * Repair → diagramToElkInput (elkjs) → elk.layout. Shared by R5 SVG and R6 React Flow.
     * @param {object|null} diagram
     * @returns {Promise<{ ok: boolean, laidOut?: object, error?: string, warnings?: object[] }>}
     */
    async function runElkLayoutPipeline(diagram) {
        var mergedWarnings = [];
        if (!diagram || typeof diagram !== 'object') {
            return { ok: false, error: 'no_diagram', warnings: mergedWarnings };
        }
        if (typeof global.diagramToElkInput !== 'function') {
            return { ok: false, error: 'diagramToElkInput missing', warnings: mergedWarnings };
        }
        var elkInputOpts = { target: 'elkjs' };
        var vt = global.viewTune;
        if (vt && typeof vt.elkLeafNodeWidth === 'number' && !isNaN(vt.elkLeafNodeWidth)) {
            elkInputOpts.leafNodeWidth = vt.elkLeafNodeWidth;
        }
        var pack = global.diagramToElkInput(diagram, elkInputOpts);
        if (pack.warnings && pack.warnings.length) mergedWarnings = mergedWarnings.concat(pack.warnings);
        if (!pack.ok || !pack.elkGraph) {
            return {
                ok: false,
                error: pack.reason || 'diagramToElkInput failed',
                warnings: mergedWarnings,
            };
        }
        var ELKCtor = global.ELK;
        if (!ELKCtor) {
            return { ok: false, error: 'ELK not loaded (include elk.bundled.js)', warnings: mergedWarnings };
        }
        var elkGraph;
        try {
            elkGraph = JSON.parse(JSON.stringify(pack.elkGraph));
        } catch (e) {
            return { ok: false, error: 'clone failed: ' + String(e), warnings: mergedWarnings };
        }
        var elk = new ELKCtor();
        var laidOut;
        try {
            laidOut = await elk.layout(elkGraph);
        } catch (err) {
            return {
                ok: false,
                error: err && err.message ? err.message : String(err),
                warnings: mergedWarnings,
            };
        }
        return { ok: true, laidOut: laidOut, warnings: mergedWarnings };
    }

    /**
     * @param {object|null} diagram - diagram IR (nodes, edges, groups)
     * @returns {Promise<{ ok: boolean, svg?: string, error?: string, warnings?: object[] }>}
     */
    async function runElkLayoutSvgPipeline(diagram) {
        var r = await runElkLayoutPipeline(diagram);
        if (!r.ok) {
            return { ok: false, error: r.error || 'layout failed', svg: '', warnings: r.warnings || [] };
        }
        var svg = elkLaidOutGraphToSvgMarkup(r.laidOut, {
            groupLabelsOutside: true,
            diagram: diagram,
        });
        return { ok: true, svg: svg, warnings: r.warnings || [] };
    }

    global.elkLaidOutGraphToSvgMarkup = elkLaidOutGraphToSvgMarkup;
    global.runElkLayoutPipeline = runElkLayoutPipeline;
    global.runElkLayoutSvgPipeline = runElkLayoutSvgPipeline;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            elkLaidOutGraphToSvgMarkup,
            runElkLayoutPipeline,
            runElkLayoutSvgPipeline,
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
