document.addEventListener('DOMContentLoaded', () => {
    // TOP NAVBAR NAVIGATION TABS
    const navItems = document.querySelectorAll('.nav-item');
    const tabPages = document.querySelectorAll('.tab-page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            navItems.forEach(n => n.classList.remove('active'));
            tabPages.forEach(p => p.classList.add('hidden'));

            item.classList.add('active');
            const page = document.getElementById(targetTab);
            if (page) page.classList.remove('hidden');
        });
    });

    // DOM Elements - Formatter Workbench
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const uploadForm = document.getElementById('uploadForm');
    const cleanBtn = document.getElementById('cleanBtn');
    const alertBox = document.getElementById('alertBox');
    
    const resultsSection = document.getElementById('resultsSection');
    const statTestCases = document.getElementById('statTestCases');
    const statRows = document.getElementById('statRows');
    const statChecked = document.getElementById('statChecked');
    const statChanged = document.getElementById('statChanged');
    const changesCountBadge = document.getElementById('changesCountBadge');
    
    const downloadBtn = document.getElementById('downloadBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const changesView = document.getElementById('changesView');
    const unchangedView = document.getElementById('unchangedView');
    const gridView = document.getElementById('gridView');
    const changesTableBody = document.getElementById('changesTableBody');
    const unchangedTableBody = document.getElementById('unchangedTableBody');
    const gridTableHeader = document.getElementById('gridTableHeader');
    const gridTableBody = document.getElementById('gridTableBody');
    const searchInput = document.getElementById('searchInput');
    const unchangedCountBadge = document.getElementById('unchangedCountBadge');

    let currentFile = null;
    let currentFileId = null;
    let processedData = null;

    // File Selection & Drag-and-Drop
    dropzone.addEventListener('click', (e) => {
        if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            handleFileSelect(dt.files[0]);
        }
    });

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileSelection();
    });

    function handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showAlert('Please upload a CSV file.', 'danger');
            resetFileSelection();
            return;
        }
        hideAlert();
        currentFile = file;
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
        cleanBtn.disabled = false;

        // Auto clean file immediately upon uploading
        uploadForm.requestSubmit();
    }

    function resetFileSelection() {
        currentFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        cleanBtn.disabled = true;
    }

    // Live Auto-Reprocess when formatting options change
    const liveOptionIds = [
        'bulletFormatSelect',
        'decodeHtmlEntitiesCheck',
        'normQuotesCheck',
        'stripInvisibleCheck'
    ];
    liveOptionIds.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('change', () => {
                if (currentFile) {
                    uploadForm.requestSubmit();
                }
            });
        }
    });

    // Cumulative Find & Replace rules state
    let appliedRules = [];

    function renderAppliedRules() {
        const section = document.getElementById('appliedRulesSection');
        const container = document.getElementById('appliedRulesContainer');
        const countSpan = document.getElementById('appliedRulesCount');
        if (!section || !container) return;

        if (appliedRules.length === 0) {
            section.classList.add('hidden');
            container.innerHTML = '';
            if (countSpan) countSpan.textContent = '0';
            return;
        }

        section.classList.remove('hidden');
        if (countSpan) countSpan.textContent = appliedRules.length;
        container.innerHTML = '';

        appliedRules.forEach((rule, idx) => {
            const chip = document.createElement('div');
            chip.style.cssText = 'background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #c7d2fe; padding: 0.25rem 0.55rem; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--font-mono);';
            
            const findText = escapeHtml(rule.find);
            const replText = escapeHtml(rule.replace !== '' ? rule.replace : '∅ (delete)');
            const opts = [];
            if (rule.match_case) opts.push('case');
            if (rule.is_regex) opts.push('regex');
            const optStr = opts.length > 0 ? ` [${opts.join(', ')}]` : '';

            chip.innerHTML = `
                <span>#${idx + 1} <strong>"${findText}"</strong> ➔ <strong>"${replText}"</strong>${optStr}</span>
                <button type="button" class="remove-rule-btn" data-idx="${idx}" title="Remove rule" style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 0.95rem; line-height: 1; padding: 0 0.15rem; margin-left: 0.25rem;">&times;</button>
            `;

            const removeBtn = chip.querySelector('.remove-rule-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                appliedRules.splice(idx, 1);
                renderAppliedRules();
                if (currentFile) {
                    uploadForm.requestSubmit();
                }
            });

            container.appendChild(chip);
        });
    }

    const clearAllRulesBtn = document.getElementById('clearAllRulesBtn');
    if (clearAllRulesBtn) {
        clearAllRulesBtn.addEventListener('click', () => {
            appliedRules = [];
            renderAppliedRules();
            if (currentFile) {
                uploadForm.requestSubmit();
            }
        });
    }

    // Explicit confirmation button for Find & Replace
    const applyFindReplaceBtn = document.getElementById('applyFindReplaceBtn');
    if (applyFindReplaceBtn) {
        applyFindReplaceBtn.addEventListener('click', () => {
            const findIn = document.getElementById('customFindInput');
            const replIn = document.getElementById('customReplaceInput');
            const mcCheck = document.getElementById('matchCaseCheck');
            const regexCheck = document.getElementById('useRegexCheck');

            if (findIn && findIn.value.trim() !== '') {
                appliedRules.push({
                    find: findIn.value,
                    replace: replIn ? replIn.value : '',
                    match_case: mcCheck ? mcCheck.checked : false,
                    is_regex: regexCheck ? regexCheck.checked : false
                });
                findIn.value = '';
                if (replIn) replIn.value = '';
                renderAppliedRules();
            }

            if (currentFile) {
                uploadForm.requestSubmit();
            }
        });
    }

    const clearFindReplaceBtn = document.getElementById('clearFindReplaceBtn');
    if (clearFindReplaceBtn) {
        clearFindReplaceBtn.addEventListener('click', () => {
            const findIn = document.getElementById('customFindInput');
            const replIn = document.getElementById('customReplaceInput');
            const mcCheck = document.getElementById('matchCaseCheck');
            const regexCheck = document.getElementById('useRegexCheck');
            if (findIn) findIn.value = '';
            if (replIn) replIn.value = '';
            if (mcCheck) mcCheck.checked = false;
            if (regexCheck) regexCheck.checked = false;
        });
    }

    ['customFindInput', 'customReplaceInput'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (applyFindReplaceBtn) applyFindReplaceBtn.click();
                }
            });
        }
    });

    // Form Submission & Clean CSV
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentFile) return;

        setLoading(true);
        hideAlert();

        const formData = new FormData();
        formData.append('file', currentFile);

        const bulletFormatSelect = document.getElementById('bulletFormatSelect');
        if (bulletFormatSelect) {
            formData.append('bullet_format', bulletFormatSelect.value);
        }

        const decodeHtmlCheck = document.getElementById('decodeHtmlEntitiesCheck');
        if (decodeHtmlCheck) {
            formData.append('decode_html_entities', decodeHtmlCheck.checked ? 'true' : 'false');
        }

        const normQuotesCheck = document.getElementById('normQuotesCheck');
        if (normQuotesCheck) {
            formData.append('normalize_smart_quotes', normQuotesCheck.checked ? 'true' : 'false');
        }

        const escapePipesCheck = document.getElementById('escapePipesCheck');
        if (escapePipesCheck) {
            formData.append('escape_pipes', escapePipesCheck.checked ? 'true' : 'false');
        }

        const stripInvisibleCheck = document.getElementById('stripInvisibleCheck');
        if (stripInvisibleCheck) {
            formData.append('strip_invisible_chars', stripInvisibleCheck.checked ? 'true' : 'false');
        }

        const customFindInput = document.getElementById('customFindInput');
        if (customFindInput && customFindInput.value !== '') {
            formData.append('custom_find', customFindInput.value);
        }

        const customReplaceInput = document.getElementById('customReplaceInput');
        if (customReplaceInput) {
            formData.append('custom_replace', customReplaceInput.value);
        }

        const matchCaseCheck = document.getElementById('matchCaseCheck');
        if (matchCaseCheck) {
            formData.append('match_case', matchCaseCheck.checked ? 'true' : 'false');
        }

        const useRegexCheck = document.getElementById('useRegexCheck');
        if (useRegexCheck) {
            formData.append('is_regex', useRegexCheck.checked ? 'true' : 'false');
        }

        if (appliedRules.length > 0) {
            formData.append('find_replace_rules', JSON.stringify(appliedRules));
        }

        try {
            const response = await fetch('/clean', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Failed to clean CSV file.');
            }

            currentFileId = data.file_id;
            processedData = data.stats;
            renderResults(data.stats);

        } catch (err) {
            showAlert(err.message, 'danger');
            resultsSection.classList.add('hidden');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        cleanBtn.disabled = isLoading;
        const btnText = cleanBtn.querySelector('.btn-text');
        const spinner = cleanBtn.querySelector('.spinner');

        if (isLoading) {
            btnText.textContent = 'Formatting Test Cases...';
            spinner.classList.remove('hidden');
        } else {
            btnText.textContent = 'Format & Clean CSV';
            spinner.classList.add('hidden');
        }
    }

    // Render Stats & Preview Tables
    function renderResults(stats) {
        if (statTestCases) {
            statTestCases.textContent = (stats.total_test_cases || stats.total_rows).toLocaleString();
        }
        statRows.textContent = stats.total_rows.toLocaleString();
        statChecked.textContent = stats.cells_checked.toLocaleString();
        statChanged.textContent = stats.cells_changed.toLocaleString();
        changesCountBadge.textContent = stats.changes.length.toLocaleString();

        renderChangesTable(stats.changes);
        renderUnchangedTable(stats.rows_preview, stats.columns);
        renderGridView(stats.columns, stats.rows_preview);

        // Render Warnings Banner if any unclosed quotes detected
        const csvWarningsCard = document.getElementById('csvWarningsCard');
        const warningsCountText = document.getElementById('warningsCountText');
        const warningsListContainer = document.getElementById('warningsListContainer');

        if (csvWarningsCard && warningsListContainer) {
            if (stats.warnings && stats.warnings.length > 0) {
                csvWarningsCard.classList.remove('hidden');
                if (warningsCountText) warningsCountText.textContent = stats.warnings.length.toLocaleString();
                warningsListContainer.innerHTML = '';

                stats.warnings.forEach(w => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: rgba(0,0,0,0.25); border-left: 3px solid #f59e0b; padding: 0.35rem 0.6rem; border-radius: 4px; font-family: var(--font-mono); font-size: 0.75rem;';
                    const warnMsg = w.message ? (w.message.includes(']: ') ? w.message.split(']: ')[1] : w.message) : 'Unclosed or mismatched symbol detected.';
                    item.innerHTML = `
                        <div><strong style="color: #fbbf24;">Row #${w.row}</strong>, Column <span class="badge" style="background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.3);">${escapeHtml(w.column)}</span>: ${escapeHtml(warnMsg)}</div>
                        <div style="color: var(--text-muted); font-size: 0.7rem; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">"<em>${escapeHtml(w.snippet)}</em>"</div>
                    `;
                    warningsListContainer.appendChild(item);
                });
            } else {
                csvWarningsCard.classList.add('hidden');
            }
        }

        if (stats.columns) {
            renderColumnMapping(stats.columns, 'trColumnMappingContainer');
            renderColumnMapping(stats.columns, 'tabColumnMappingContainer');
        }

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function renderUnchangedTable(rows, columns) {
        if (!unchangedTableBody) return;
        unchangedTableBody.innerHTML = '';
        let unchangedList = [];

        rows.forEach(rowItem => {
            columns.forEach(col => {
                const cellObj = rowItem.data[col];
                if (cellObj && !cellObj.changed && cellObj.cleaned && String(cellObj.cleaned).trim() !== '') {
                    unchangedList.push({
                        row: rowItem.row,
                        column: col,
                        cleaned: cellObj.cleaned,
                        rowObj: rowItem
                    });
                }
            });
        });

        if (unchangedCountBadge) {
            unchangedCountBadge.textContent = unchangedList.length.toLocaleString();
        }

        if (unchangedList.length === 0) {
            unchangedTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-state">
                        No unedited non-empty cells found.
                    </td>
                </tr>
            `;
            return;
        }

        unchangedList.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${item.row}</strong></td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border-color: var(--border-color);">${escapeHtml(item.column)}</span></td>
                <td><div class="text-box" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.8125rem;">${escapeHtml(item.cleaned)}</div></td>
            `;
            tr.addEventListener('click', () => {
                if (item.rowObj) openRowInspector(item.rowObj);
            });
            unchangedTableBody.appendChild(tr);
        });
    }

    function computeInlineDiff(originalText, cleanedText) {
        if (originalText === null || originalText === undefined) originalText = '';
        if (cleanedText === null || cleanedText === undefined) cleanedText = '';

        const origStr = String(originalText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const cleanStr = String(cleanedText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        if (origStr === cleanStr) {
            return {
                originalHtml: formatDiffText(origStr),
                cleanedHtml: formatDiffText(cleanStr)
            };
        }

        // Tokenize by word boundary, punctuation, symbols, whitespace
        function tokenize(str) {
            return str.match(/([^\s\w]|[a-zA-Z0-9_]+|\s+)/g) || [];
        }

        function isTokenEqual(a, b) {
            if (a === b) return true;
            // Normalize Unicode angle brackets (< vs ＜, > vs ＞) for tag protection comparison
            const normA = a.replace(/＜/g, '<').replace(/＞/g, '>');
            const normB = b.replace(/＜/g, '<').replace(/＞/g, '>');
            if (normA === normB) return true;

            // Treat whitespace/indentation tokens as equal if both are pure whitespace
            if (/^\s+$/.test(a) && /^\s+$/.test(b)) return true;

            return false;
        }

        const tokensA = tokenize(origStr);
        const tokensB = tokenize(cleanStr);

        const m = tokensA.length;
        const n = tokensB.length;

        // DP matrix for LCS
        const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (isTokenEqual(tokensA[i - 1], tokensB[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find matches
        let i = m, j = n;
        const matches = [];
        while (i > 0 && j > 0) {
            if (isTokenEqual(tokensA[i - 1], tokensB[j - 1])) {
                matches.push({ aIdx: i - 1, bIdx: j - 1 });
                i--;
                j--;
            } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        matches.reverse();

        let origHtml = '';
        let cleanHtml = '';

        let currA = 0;
        let currB = 0;

        for (const match of matches) {
            while (currA < match.aIdx) {
                const tok = tokensA[currA];
                origHtml += `<span class="diff-removed">${escapeHtml(tok)}</span>`;
                currA++;
            }

            while (currB < match.bIdx) {
                const tok = tokensB[currB];
                cleanHtml += `<span class="diff-added">${escapeHtml(tok)}</span>`;
                currB++;
            }

            const tokA = tokensA[currA];
            const tokB = tokensB[currB];
            origHtml += formatDiffText(tokA);
            cleanHtml += formatDiffText(tokB);

            currA++;
            currB++;
        }

        while (currA < m) {
            const tok = tokensA[currA];
            origHtml += `<span class="diff-removed">${escapeHtml(tok)}</span>`;
            currA++;
        }

        while (currB < n) {
            const tok = tokensB[currB];
            cleanHtml += `<span class="diff-added">${escapeHtml(tok)}</span>`;
            currB++;
        }

        return {
            originalHtml: origHtml,
            cleanedHtml: cleanHtml
        };
    }

    function renderChangesTable(changes) {
        changesTableBody.innerHTML = '';

        if (changes.length === 0) {
            changesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        🎉 No formatting issues found! All cells already follow standard formatting.
                    </td>
                </tr>
            `;
            return;
        }

        changes.forEach(item => {
            const tr = document.createElement('tr');
            
            let changeLabel = '';
            if (item.original.trim() === item.cleaned.trim()) {
                changeLabel = '<span class="change-tag ws-tag">Removed Trailing Space</span>';
            } else if (item.original.includes('  -') || item.original.includes('   -')) {
                changeLabel = '<span class="change-tag bullet-tag">Normalized Bullet Indent</span>';
            } else {
                changeLabel = '<span class="change-tag bullet-tag">Text Modified</span>';
            }

            const diff = computeInlineDiff(item.original, item.cleaned);

            tr.innerHTML = `
                <td><strong>#${item.row}</strong> ${changeLabel}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border-color: var(--border-color);">${escapeHtml(item.column)}</span></td>
                <td><div class="text-box original">${diff.originalHtml}</div></td>
                <td><div class="text-box cleaned">${diff.cleanedHtml}</div></td>
            `;
            tr.addEventListener('click', () => {
                if (processedData && processedData.rows_preview) {
                    const rowObj = processedData.rows_preview.find(r => r.row === item.row);
                    if (rowObj) openRowInspector(rowObj);
                }
            });
            changesTableBody.appendChild(tr);
        });
    }

    function formatDiffText(text) {
        if (text === null || text === undefined) return '';
        const lines = String(text).split('\n');
        return lines.map(line => {
            const match = line.match(/^(\S.*?)(\s+)$/);
            if (match) {
                const base = match[1];
                const spaces = match[2].replace(/ /g, '·').replace(/\t/g, '→');
                return escapeHtml(base) + `<span class="ws-highlight" title="${match[2].length} trailing space(s)">${spaces}</span>`;
            }
            return escapeHtml(line);
        }).join('\n');
    }

    function renderGridView(columns, rows) {
        if (!gridTableHeader || !gridTableBody) return;

        gridTableHeader.innerHTML = '';
        const headerTr = document.createElement('tr');

        let headersHtml = `<th>Row #</th>`;
        columns.forEach((col) => {
            headersHtml += `<th>${escapeHtml(col)}</th>`;
        });
        headersHtml += `<th style="text-align: center; min-width: 120px;">Action</th>`;

        headerTr.innerHTML = headersHtml;
        gridTableHeader.appendChild(headerTr);

        gridTableBody.innerHTML = '';
        if (rows.length === 0) {
            gridTableBody.innerHTML = `<tr><td colspan="${columns.length + 2}" class="empty-state">No row data available.</td></tr>`;
            return;
        }

        rows.forEach(rowItem => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-row-idx', rowItem.row);

            let hasAnyChange = false;
            columns.forEach(col => {
                const cellObj = rowItem.data[col];
                if (cellObj && cellObj.changed) hasAnyChange = true;
            });

            if (hasAnyChange) {
                tr.classList.add('excel-row-has-changed');
            }

            let cellsHtml = `<td><strong>#${rowItem.row}</strong> ${hasAnyChange ? '<span style="color:#34d399; font-size: 0.75rem;" title="Row contains formatted/edited cells">✨</span>' : ''}</td>`;

            columns.forEach(col => {
                const cellObj = rowItem.data[col] || { cleaned: '', original: '', changed: false };
                const isChanged = cellObj.changed;
                const cellClass = isChanged ? 'excel-cell excel-cell-changed' : 'excel-cell';

                let badgeHtml = '';
                let cellTextHtml = formatDiffText(cellObj.cleaned);

                if (isChanged) {
                    badgeHtml = `<span class="excel-edited-badge" title="Original text: ${escapeHtml(cellObj.original)}">✏️ EDITED</span>`;
                    const diff = computeInlineDiff(cellObj.original, cellObj.cleaned);
                    cellTextHtml = diff.cleanedHtml;
                }

                cellsHtml += `
                    <td class="${cellClass}">
                        <div class="excel-cell-content">
                            ${badgeHtml}
                            <div class="excel-cell-text">${cellTextHtml}</div>
                        </div>
                    </td>
                `;
            });

            cellsHtml += `
                <td class="excel-action-cell">
                    <button type="button" class="btn-inspect-row">🔍 View Detail</button>
                </td>
            `;

            tr.innerHTML = cellsHtml;

            const btnInspect = tr.querySelector('.btn-inspect-row');
            if (btnInspect) {
                btnInspect.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRowInspector(rowItem);
                });
            }

            tr.addEventListener('click', () => openRowInspector(rowItem));
            gridTableBody.appendChild(tr);
        });
    }

    // Enable Mouse Click & Drag Panning for both tables
    function enableDragScroll(container) {
        if (!container) return;
        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || ['INPUT', 'BUTTON', 'SELECT', 'A', 'TEXTAREA'].includes(e.target.tagName)) return;
            isDown = true;
            container.classList.add('grabbing');
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.classList.remove('grabbing');
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.classList.remove('grabbing');
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });
    }

    enableDragScroll(changesView);
    enableDragScroll(unchangedView);
    enableDragScroll(gridView);

    // Row Detail Inspector Modal Logic
    const rowDetailModal = document.getElementById('rowDetailModal');
    const rowDetailModalTitle = document.getElementById('rowDetailModalTitle');
    const rowDetailModalBody = document.getElementById('rowDetailModalBody');
    const closeRowModalBtn = document.getElementById('closeRowModalBtn');
    const closeRowModalFooterBtn = document.getElementById('closeRowModalFooterBtn');

    function openRowInspector(rowItem) {
        if (!rowItem || !processedData) return;
        rowDetailModalTitle.textContent = `🔍 Row #${rowItem.row} Full Column Inspector`;
        rowDetailModalBody.innerHTML = '';

        processedData.columns.forEach(col => {
            const cellObj = rowItem.data[col] || { original: '', cleaned: '', changed: false };
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem;';

            let diffHtml = '';
            if (cellObj.changed) {
                const diff = computeInlineDiff(cellObj.original, cellObj.cleaned);
                diffHtml = `
                    <div style="font-size: 0.75rem; color: var(--danger); font-weight: 600;">Original:</div>
                    <div class="text-box original" style="font-size: 0.8125rem;">${diff.originalHtml}</div>
                    <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; margin-top: 0.25rem;">Cleaned:</div>
                    <div class="text-box cleaned" style="font-size: 0.8125rem;">${diff.cleanedHtml}</div>
                `;
            } else {
                diffHtml = `<div class="text-box" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.8125rem;">${escapeHtml(cellObj.cleaned || '(empty)')}</div>`;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge" style="font-size: 0.8125rem; background: var(--primary-light); color: #a5b4fc;">${escapeHtml(col)}</span>
                    ${cellObj.changed ? '<span class="change-tag bullet-tag">Formatted</span>' : ''}
                </div>
                ${diffHtml}
            `;
            rowDetailModalBody.appendChild(card);
        });

        rowDetailModal.classList.remove('hidden');
    }

    function closeRowInspector() {
        if (rowDetailModal) rowDetailModal.classList.add('hidden');
    }

    if (closeRowModalBtn) closeRowModalBtn.addEventListener('click', closeRowInspector);
    if (closeRowModalFooterBtn) closeRowModalFooterBtn.addEventListener('click', closeRowInspector);

    // Tabs Switcher (Edited vs Unedited vs Full Grid)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const viewMode = btn.getAttribute('data-view');
            if (viewMode === 'changes') {
                if (changesView) changesView.classList.remove('hidden');
                if (unchangedView) unchangedView.classList.add('hidden');
                if (gridView) gridView.classList.add('hidden');
            } else if (viewMode === 'unchanged') {
                if (changesView) changesView.classList.add('hidden');
                if (unchangedView) unchangedView.classList.remove('hidden');
                if (gridView) gridView.classList.add('hidden');
            } else {
                if (changesView) changesView.classList.add('hidden');
                if (unchangedView) unchangedView.classList.add('hidden');
                if (gridView) gridView.classList.remove('hidden');
            }
        });
    });

    // Tab switching for Preview Views (Excel Grid, Changed Cells, Unchanged Cells)
    const previewTabBtns = document.querySelectorAll('.preview-toolbar .tab-btn');
    previewTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-view');
            previewTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (changesView) changesView.classList.add('hidden');
            if (unchangedView) unchangedView.classList.add('hidden');
            if (gridView) gridView.classList.add('hidden');

            if (targetView === 'grid' && gridView) gridView.classList.remove('hidden');
            if (targetView === 'changes' && changesView) changesView.classList.remove('hidden');
            if (targetView === 'unchanged' && unchangedView) unchangedView.classList.remove('hidden');
        });
    });

    // Download Button
    downloadBtn.addEventListener('click', () => {
        if (currentFileId) {
            window.location.href = `/download/${currentFileId}`;
        }
    });

    // Search Filter
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (changesTableBody) filterTableRows(changesTableBody, query);
        if (unchangedTableBody) filterTableRows(unchangedTableBody, query);
        if (gridTableBody) filterTableRows(gridTableBody, query);
    });

    function filterTableRows(tbody, query) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (!query || text.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Dynamic Column Mapping Renderer
    function renderColumnMapping(columns, targetContainerId) {
        const container = document.getElementById(targetContainerId);
        if (!container) return;
        container.innerHTML = '';

        if (!columns || columns.length === 0) {
            container.innerHTML = '<p class="subtitle" style="font-size: 0.75rem;">Upload a CSV file first to detect columns.</p>';
            return;
        }

        const testRailFields = [
            { label: 'Title (title)', key: 'title' },
            { label: 'Type (type_id)', key: 'type_id' },
            { label: 'Priority (priority_id)', key: 'priority_id' },
            { label: 'Preconditions (custom_preconds)', key: 'custom_preconds' },
            { label: 'Steps Content (custom_steps)', key: 'custom_steps' },
            { label: 'Expected Result (custom_expected)', key: 'custom_expected' },
            { label: 'References (refs)', key: 'refs' },
            { label: 'Applicable Products (custom_swpd_tc_applicable_prods)', key: 'custom_swpd_tc_applicable_prods' },
            { label: 'Links to Related Document (custom_tc_links_to_docs)', key: 'custom_tc_links_to_docs' },
            { label: 'Section (Parent Section)', key: 'section' },
            { label: 'Sub-Section (Child Section)', key: 'sub_section' },
            { label: '-- Ignore Column --', key: 'ignore' }
        ];

        columns.forEach(col => {
            const colLower = col.trim().toLowerCase();
            let defaultKey = 'ignore';

            if (colLower === '#' || colLower === 'id') defaultKey = 'ignore';
            else if (colLower === 'title') defaultKey = 'title';
            else if (colLower === 'type') defaultKey = 'type_id';
            else if (colLower === 'priority') defaultKey = 'priority_id';
            else if (colLower === 'preconditions' || colLower === 'precondition') defaultKey = 'custom_preconds';
            else if (colLower === 'steps' || colLower === 'step') defaultKey = 'custom_steps';
            else if (colLower.includes('expected')) defaultKey = 'custom_expected';
            else if (colLower === 'references' || colLower === 'refs') defaultKey = 'refs';
            else if (colLower.includes('applicable') || colLower.includes('product')) defaultKey = 'custom_swpd_tc_applicable_prods';
            else if (colLower.includes('link') || colLower.includes('doc')) defaultKey = 'custom_tc_links_to_docs';
            else if (colLower === 'section') defaultKey = 'section';
            else if (colLower.includes('sub')) defaultKey = 'sub_section';

            const div = document.createElement('div');
            div.style.cssText = 'display: grid; grid-template-columns: 1fr 20px 1fr; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.25); padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);';

            let optionsHtml = testRailFields.map(f => {
                const selected = (f.key === defaultKey) ? 'selected' : '';
                return `<option value="${f.key}" ${selected}>${f.label}</option>`;
            }).join('');

            div.innerHTML = `
                <span style="font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(col)}</span>
                <span style="color: var(--primary); text-align: center; font-weight: bold;">➔</span>
                <select class="form-control col-map-select" data-col="${escapeHtml(col)}" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem; cursor: pointer;">
                    ${optionsHtml}
                </select>
            `;
            container.appendChild(div);
        });
    }

    // TESTRAIL API INTEGRATION & SYNC (Form Modal & Tab Form)
    const openTestRailModalBtn = document.getElementById('openTestRailModalBtn');
    const testRailModal = document.getElementById('testRailModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const testRailForm = document.getElementById('testRailForm');

    // Modal elements
    const trUrl = document.getElementById('trUrl');
    const trEmail = document.getElementById('trEmail');
    const trApiKey = document.getElementById('trApiKey');
    const trProjectId = document.getElementById('trProjectId');
    const trSuiteId = document.getElementById('trSuiteId');
    const rememberCreds = document.getElementById('rememberCreds');
    const trSectionSelect = document.getElementById('trSectionSelect');
    const fetchSectionsBtn = document.getElementById('fetchSectionsBtn');
    const trLogConsole = document.getElementById('trLogConsole');
    const trAlertBox = document.getElementById('trAlertBox');
    const submitPushBtn = document.getElementById('submitPushBtn');

    // Tab 2 Sync elements
    const tabTrUrl = document.getElementById('tabTrUrl');
    const tabTrEmail = document.getElementById('tabTrEmail');
    const tabTrApiKey = document.getElementById('tabTrApiKey');
    const tabTrProjectId = document.getElementById('tabTrProjectId');
    const tabTrSuiteId = document.getElementById('tabTrSuiteId');
    const tabRememberCreds = document.getElementById('tabRememberCreds');
    const tabTrSectionSelect = document.getElementById('tabTrSectionSelect');
    const tabFetchSectionsBtn = document.getElementById('tabFetchSectionsBtn');
    const tabTrLogConsole = document.getElementById('tabTrLogConsole');
    const tabTrAlertBox = document.getElementById('tabTrAlertBox');
    const tabSubmitPushBtn = document.getElementById('tabSubmitPushBtn');
    const testRailTabForm = document.getElementById('testRailTabForm');

    loadSavedTestRailCreds();

    async function loadSavedTestRailCreds() {
        const saved = localStorage.getItem('testrail_creds');
        let creds = null;
        if (saved) {
            try { creds = JSON.parse(saved); } catch (e) {}
        }
        
        if (!creds) {
            try {
                const resp = await fetch('/api/config');
                if (resp.ok) {
                    const config = await resp.json();
                    creds = {
                        url: config.testrail_url,
                        email: config.email,
                        apiKey: config.api_key,
                        projectId: config.project_id
                    };
                }
            } catch (e) {}
        }

        if (creds) {
            if (creds.url) { trUrl.value = creds.url; if (tabTrUrl) tabTrUrl.value = creds.url; }
            if (creds.email) { trEmail.value = creds.email; if (tabTrEmail) tabTrEmail.value = creds.email; }
            if (creds.apiKey) { trApiKey.value = creds.apiKey; if (tabTrApiKey) tabTrApiKey.value = creds.apiKey; }
            if (creds.projectId) { trProjectId.value = creds.projectId; if (tabTrProjectId) tabTrProjectId.value = creds.projectId; }
            if (creds.suiteId) { trSuiteId.value = creds.suiteId; if (tabTrSuiteId) tabTrSuiteId.value = creds.suiteId; }
        }
    }

    function saveTestRailCreds(urlVal, emailVal, apiVal, projectVal, suiteVal) {
        const creds = {
            url: urlVal,
            email: emailVal,
            apiKey: apiVal,
            projectId: projectVal,
            suiteId: suiteVal
        };
        localStorage.setItem('testrail_creds', JSON.stringify(creds));
    }

    // Modal controls
    if (openTestRailModalBtn) {
        openTestRailModalBtn.addEventListener('click', () => {
            hideTrAlert(trAlertBox);
            trLogConsole.classList.add('hidden');
            trLogConsole.textContent = '';
            testRailModal.classList.remove('hidden');
            
            if (trUrl.value && trEmail.value && trApiKey.value && trProjectId.value) {
                fetchTestRailSections(trUrl, trEmail, trApiKey, trProjectId, trSuiteId, trSectionSelect, fetchSectionsBtn, trAlertBox);
            }
            if (processedData && processedData.columns) {
                renderColumnMapping(processedData.columns, 'trColumnMappingContainer');
            }
        });
    }

    if (fetchSectionsBtn) {
        fetchSectionsBtn.addEventListener('click', () => {
            fetchTestRailSections(trUrl, trEmail, trApiKey, trProjectId, trSuiteId, trSectionSelect, fetchSectionsBtn, trAlertBox);
        });
    }

    if (tabFetchSectionsBtn) {
        tabFetchSectionsBtn.addEventListener('click', () => {
            fetchTestRailSections(tabTrUrl, tabTrEmail, tabTrApiKey, tabTrProjectId, tabTrSuiteId, tabTrSectionSelect, tabFetchSectionsBtn, tabTrAlertBox);
        });
    }

    async function fetchTestRailSections(urlEl, emailEl, apiEl, projectEl, suiteEl, selectEl, btnEl, alertEl) {
        if (!urlEl.value || !emailEl.value || !apiEl.value || !projectEl.value) {
            showTrAlert(alertEl, 'Please enter URL, Email, API Key, and Project ID first.', 'warning');
            return;
        }

        btnEl.textContent = '⏳ Loading...';
        btnEl.disabled = true;

        try {
            const resp = await fetch('/get-testrail-sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testrail_url: urlEl.value.trim(),
                    email: emailEl.value.trim(),
                    api_key: apiEl.value.trim(),
                    project_id: projectEl.value.trim(),
                    suite_id: suiteEl ? suiteEl.value.trim() : ''
                })
            });

            const data = await resp.json();
            if (!resp.ok || data.error) {
                throw new Error(data.error || 'Failed to load sections.');
            }

            selectEl.innerHTML = '<option value="">-- Root Level (Auto-create Sections from CSV) --</option>';
            if (data.sections && data.sections.length > 0) {
                data.sections.forEach(sec => {
                    const opt = document.createElement('option');
                    opt.value = sec.path;
                    opt.textContent = `📁 ${sec.path}`;
                    selectEl.appendChild(opt);
                });
                showTrAlert(alertEl, `Loaded ${data.sections.length} sections from TestRail.`, 'success');
            } else {
                showTrAlert(alertEl, 'No existing sections found in project.', 'info');
            }
        } catch (err) {
            showTrAlert(alertEl, err.message, 'danger');
        } finally {
            btnEl.textContent = '🔄 Fetch Section Tree from TestRail';
            btnEl.disabled = false;
        }
    }

    function closeTestRailModal() {
        if (testRailModal) testRailModal.classList.add('hidden');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeTestRailModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeTestRailModal);

    // Handle Push Form Modal
    if (testRailForm) {
        testRailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentFileId) {
                showTrAlert(trAlertBox, 'Please format a CSV file first.', 'warning');
                return;
            }

            if (rememberCreds.checked) {
                saveTestRailCreds(trUrl.value.trim(), trEmail.value.trim(), trApiKey.value.trim(), trProjectId.value.trim(), trSuiteId.value.trim());
            }

            executePush(
                trUrl.value.trim(), trEmail.value.trim(), trApiKey.value.trim(),
                trProjectId.value.trim(), trSuiteId.value.trim(),
                trSectionSelect.value.trim(), 'trColumnMappingContainer',
                trLogConsole, trAlertBox, submitPushBtn
            );
        });
    }

    // Handle Push Form Tab 2
    if (testRailTabForm) {
        testRailTabForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentFileId) {
                showTrAlert(tabTrAlertBox, 'Please upload and format a CSV file in Formatter Studio tab first.', 'warning');
                return;
            }

            if (tabRememberCreds.checked) {
                saveTestRailCreds(tabTrUrl.value.trim(), tabTrEmail.value.trim(), tabTrApiKey.value.trim(), tabTrProjectId.value.trim(), tabTrSuiteId.value.trim());
            }

            executePush(
                tabTrUrl.value.trim(), tabTrEmail.value.trim(), tabTrApiKey.value.trim(),
                tabTrProjectId.value.trim(), tabTrSuiteId.value.trim(),
                tabTrSectionSelect.value.trim(), 'tabColumnMappingContainer',
                tabTrLogConsole, tabTrAlertBox, tabSubmitPushBtn
            );
        });
    }

    async function executePush(urlVal, emailVal, apiVal, projectVal, suiteVal, targetSecVal, mappingContainerId, logConsoleEl, alertBoxEl, submitBtnEl) {
        setTrPushLoading(submitBtnEl, true);
        hideTrAlert(alertBoxEl);

        logConsoleEl.classList.remove('hidden');
        logConsoleEl.textContent = '⏳ Connecting to TestRail API & creating Section tree nodes...';

        const customFieldsMap = {};
        const mappingSelects = document.querySelectorAll(`#${mappingContainerId} .col-map-select`);
        mappingSelects.forEach(sel => {
            const csvCol = sel.getAttribute('data-col');
            const targetField = sel.value;
            if (targetField && targetField !== 'ignore') {
                customFieldsMap[csvCol] = targetField;
            }
        });

        try {
            const response = await fetch('/push-to-testrail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: currentFileId,
                    testrail_url: urlVal,
                    email: emailVal,
                    api_key: apiVal,
                    project_id: projectVal,
                    suite_id: suiteVal,
                    target_section: targetSecVal,
                    custom_fields: customFieldsMap
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Failed to push test cases to TestRail.');
            }

            let logText = `✅ Successfully pushed ${data.total_cases_pushed} Test Case(s) to TestRail!\n\n`;
            if (data.logs && data.logs.length > 0) {
                logText += data.logs.join('\n');
            }
            logConsoleEl.textContent = logText;
            showTrAlert(alertBoxEl, `Pushed ${data.total_cases_pushed} Test Cases to TestRail successfully!`, 'success');

        } catch (err) {
            showTrAlert(alertBoxEl, err.message, 'danger');
            logConsoleEl.textContent += `\n❌ Error: ${err.message}`;
        } finally {
            setTrPushLoading(submitBtnEl, false);
        }
    }

    function setTrPushLoading(btnEl, isLoading) {
        if (!btnEl) return;
        btnEl.disabled = isLoading;
        const btnText = btnEl.querySelector('.btn-text');
        const spinner = btnEl.querySelector('.spinner');

        if (isLoading) {
            btnText.textContent = 'Pushing Test Cases to TestRail...';
            spinner.classList.remove('hidden');
        } else {
            btnText.textContent = 'Confirm & Push Test Cases';
            spinner.classList.add('hidden');
        }
    }

    function showTrAlert(alertEl, msg, type = 'danger') {
        if (!alertEl) return;
        alertEl.className = `alert alert-${type}`;
        alertEl.textContent = msg;
        alertEl.classList.remove('hidden');
    }

    function hideTrAlert(alertEl) {
        if (alertEl) alertEl.classList.add('hidden');
    }

    function hideAlert() {
        if (alertBox) alertBox.classList.add('hidden');
    }

    function showAlert(msg, type = 'danger') {
        if (!alertBox) return;
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
