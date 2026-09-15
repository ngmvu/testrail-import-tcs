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
    const warningsView = document.getElementById('warningsView');
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
    let manualEdits = {};

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
        manualEdits = {};
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
        cleanBtn.disabled = false;

        // Auto clean file immediately upon uploading
        uploadForm.requestSubmit();
    }

    function resetFileSelection() {
        currentFile = null;
        manualEdits = {};
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
    let editingRuleIndex = null;

    function syncFindReplaceInputs(fromGrid) {
        const find1 = document.getElementById('customFindInput');
        const find2 = document.getElementById('gridFindInput');
        const repl1 = document.getElementById('customReplaceInput');
        const repl2 = document.getElementById('gridReplaceInput');
        const mc1 = document.getElementById('matchCaseCheck');
        const mc2 = document.getElementById('gridMatchCaseCheck');
        const rx1 = document.getElementById('useRegexCheck');
        const rx2 = document.getElementById('gridUseRegexCheck');

        if (fromGrid) {
            if (find1 && find2) find1.value = find2.value;
            if (repl1 && repl2) repl1.value = repl2.value;
            if (mc1 && mc2) mc1.checked = mc2.checked;
            if (rx1 && rx2) rx1.checked = rx2.checked;
        } else {
            if (find1 && find2) find2.value = find1.value;
            if (repl1 && repl2) repl2.value = repl1.value;
            if (mc1 && mc2) mc2.checked = mc1.checked;
            if (rx1 && rx2) rx2.checked = rx1.checked;
        }
    }

    ['customFindInput', 'customReplaceInput', 'matchCaseCheck', 'useRegexCheck'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('input', () => syncFindReplaceInputs(false));
            elem.addEventListener('change', () => syncFindReplaceInputs(false));
        }
    });

    ['gridFindInput', 'gridReplaceInput', 'gridMatchCaseCheck', 'gridUseRegexCheck'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('input', () => syncFindReplaceInputs(true));
            elem.addEventListener('change', () => syncFindReplaceInputs(true));
        }
    });

    function renderAppliedRules() {
        const section = document.getElementById('appliedRulesSection');
        const container = document.getElementById('appliedRulesContainer');
        const countSpan = document.getElementById('appliedRulesCount');

        const gridSection = document.getElementById('gridAppliedRulesSection');
        const gridContainer = document.getElementById('gridAppliedRulesContainer');
        const gridCountSpan = document.getElementById('gridAppliedRulesCount');

        if (appliedRules.length === 0) {
            if (section) section.classList.add('hidden');
            if (gridSection) gridSection.classList.add('hidden');
            if (container) container.innerHTML = '';
            if (gridContainer) gridContainer.innerHTML = '';
            if (countSpan) countSpan.textContent = '0';
            if (gridCountSpan) gridCountSpan.textContent = '0';
            editingRuleIndex = null;
            updateApplyButtonLabel();
            return;
        }

        if (section) section.classList.remove('hidden');
        if (gridSection) gridSection.classList.remove('hidden');
        if (countSpan) countSpan.textContent = appliedRules.length;
        if (gridCountSpan) gridCountSpan.textContent = appliedRules.length;

        if (container) container.innerHTML = '';
        if (gridContainer) gridContainer.innerHTML = '';

        appliedRules.forEach((rule, idx) => {
            const isEditingThis = (editingRuleIndex === idx);
            const borderStyle = isEditingThis 
                ? 'background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fef08a;' 
                : 'background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #c7d2fe;';
            const cssText = `${borderStyle} padding: 0.25rem 0.55rem; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--font-mono);`;
            
            const findText = escapeHtml(rule.find);
            const replText = escapeHtml(rule.replace !== '' ? rule.replace : '∅ (delete)');
            const opts = [];
            if (rule.match_case) opts.push('case');
            if (rule.is_regex) opts.push('regex');
            const optStr = opts.length > 0 ? ` [${opts.join(', ')}]` : '';

            const innerHTML = `
                <span>#${idx + 1} <strong>"${findText}"</strong> ➔ <strong>"${replText}"</strong>${optStr}</span>
                <button type="button" class="edit-rule-btn" data-idx="${idx}" title="Edit rule" style="background: none; border: none; color: #a5b4fc; font-weight: bold; cursor: pointer; font-size: 0.8rem; line-height: 1; padding: 0 0.2rem; margin-left: 0.3rem;">✏️ Edit</button>
                <button type="button" class="remove-rule-btn" data-idx="${idx}" title="Remove rule" style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 0.95rem; line-height: 1; padding: 0 0.15rem;">&times;</button>
            `;

            const createChip = () => {
                const chip = document.createElement('div');
                chip.style.cssText = cssText;
                chip.innerHTML = innerHTML;

                const editBtn = chip.querySelector('.edit-rule-btn');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadRuleForEditing(idx);
                });

                const removeBtn = chip.querySelector('.remove-rule-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (editingRuleIndex === idx) editingRuleIndex = null;
                    appliedRules.splice(idx, 1);
                    renderAppliedRules();
                    if (currentFile) {
                        uploadForm.requestSubmit();
                    }
                });
                return chip;
            };

            if (container) container.appendChild(createChip());
            if (gridContainer) gridContainer.appendChild(createChip());
        });

        updateApplyButtonLabel();
    }

    function loadRuleForEditing(idx) {
        if (idx < 0 || idx >= appliedRules.length) return;
        editingRuleIndex = idx;
        const rule = appliedRules[idx];

        const findIn = document.getElementById('customFindInput');
        const replIn = document.getElementById('customReplaceInput');
        const mcCheck = document.getElementById('matchCaseCheck');
        const regexCheck = document.getElementById('useRegexCheck');

        if (findIn) findIn.value = rule.find || '';
        if (replIn) replIn.value = rule.replace || '';
        if (mcCheck) mcCheck.checked = !!rule.match_case;
        if (regexCheck) regexCheck.checked = !!rule.is_regex;

        syncFindReplaceInputs(false);
        renderAppliedRules();

        const gridDrawer = document.getElementById('gridFindReplaceDrawer');
        if (gridDrawer && !gridDrawer.classList.contains('hidden')) {
            const gridFindIn = document.getElementById('gridFindInput');
            if (gridFindIn) gridFindIn.focus();
        } else if (findIn) {
            findIn.focus();
        }
    }

    function updateApplyButtonLabel() {
        const applyBtn = document.getElementById('applyFindReplaceBtn');
        const gridApplyBtn = document.getElementById('gridApplyFindReplaceBtn');
        if (editingRuleIndex !== null) {
            const text = `✏️ Update Rule #${editingRuleIndex + 1}`;
            const bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
            if (applyBtn) { applyBtn.textContent = text; applyBtn.style.background = bg; }
            if (gridApplyBtn) { gridApplyBtn.textContent = text; gridApplyBtn.style.background = bg; }
        } else {
            const text = 'Apply Replace';
            const bg = 'linear-gradient(135deg, #6366f1, #4f46e5)';
            if (applyBtn) { applyBtn.textContent = text; applyBtn.style.background = bg; }
            if (gridApplyBtn) { gridApplyBtn.textContent = text; gridApplyBtn.style.background = bg; }
        }
    }

    ['clearAllRulesBtn', 'gridClearAllRulesBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                appliedRules = [];
                editingRuleIndex = null;
                renderAppliedRules();
                if (currentFile) {
                    uploadForm.requestSubmit();
                }
            });
        }
    });

    function handleApplyFindReplace(fromGrid) {
        syncFindReplaceInputs(fromGrid);
        const findIn = document.getElementById('customFindInput');
        const replIn = document.getElementById('customReplaceInput');
        const mcCheck = document.getElementById('matchCaseCheck');
        const regexCheck = document.getElementById('useRegexCheck');

        if (findIn && findIn.value.trim() !== '') {
            const newRule = {
                find: findIn.value,
                replace: replIn ? replIn.value : '',
                match_case: mcCheck ? mcCheck.checked : false,
                is_regex: regexCheck ? regexCheck.checked : false
            };

            if (editingRuleIndex !== null && editingRuleIndex < appliedRules.length) {
                appliedRules[editingRuleIndex] = newRule;
                editingRuleIndex = null;
            } else {
                appliedRules.push(newRule);
            }

            findIn.value = '';
            if (replIn) replIn.value = '';
            syncFindReplaceInputs(false);
            renderAppliedRules();
        }

        if (currentFile) {
            uploadForm.requestSubmit();
        }
    }

    const applyFindReplaceBtn = document.getElementById('applyFindReplaceBtn');
    if (applyFindReplaceBtn) {
        applyFindReplaceBtn.addEventListener('click', () => handleApplyFindReplace(false));
    }

    const gridApplyFindReplaceBtn = document.getElementById('gridApplyFindReplaceBtn');
    if (gridApplyFindReplaceBtn) {
        gridApplyFindReplaceBtn.addEventListener('click', () => handleApplyFindReplace(true));
    }

    function handleClearFindReplace() {
        editingRuleIndex = null;
        const findIn = document.getElementById('customFindInput');
        const replIn = document.getElementById('customReplaceInput');
        const mcCheck = document.getElementById('matchCaseCheck');
        const regexCheck = document.getElementById('useRegexCheck');
        if (findIn) findIn.value = '';
        if (replIn) replIn.value = '';
        if (mcCheck) mcCheck.checked = false;
        if (regexCheck) regexCheck.checked = false;
        syncFindReplaceInputs(false);
        updateApplyButtonLabel();
    }

    const clearFindReplaceBtn = document.getElementById('clearFindReplaceBtn');
    if (clearFindReplaceBtn) {
        clearFindReplaceBtn.addEventListener('click', handleClearFindReplace);
    }

    const gridClearFindReplaceBtn = document.getElementById('gridClearFindReplaceBtn');
    if (gridClearFindReplaceBtn) {
        gridClearFindReplaceBtn.addEventListener('click', handleClearFindReplace);
    }

    // Toggle & Close Grid Find & Replace Drawer
    const toggleFindReplaceBarBtn = document.getElementById('toggleFindReplaceBarBtn');
    const closeFindReplaceDrawerBtn = document.getElementById('closeFindReplaceDrawerBtn');
    const gridFindReplaceDrawer = document.getElementById('gridFindReplaceDrawer');

    if (toggleFindReplaceBarBtn && gridFindReplaceDrawer) {
        toggleFindReplaceBarBtn.addEventListener('click', () => {
            const isHidden = gridFindReplaceDrawer.classList.toggle('hidden');
            if (!isHidden) {
                const gridFindInput = document.getElementById('gridFindInput');
                if (gridFindInput) gridFindInput.focus();
                toggleFindReplaceBarBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                toggleFindReplaceBarBtn.style.color = 'white';
            } else {
                toggleFindReplaceBarBtn.style.background = 'rgba(139, 92, 246, 0.15)';
                toggleFindReplaceBarBtn.style.color = '#c4b5fd';
            }
        });
    }

    if (closeFindReplaceDrawerBtn && gridFindReplaceDrawer) {
        closeFindReplaceDrawerBtn.addEventListener('click', () => {
            gridFindReplaceDrawer.classList.add('hidden');
            if (toggleFindReplaceBarBtn) {
                toggleFindReplaceBarBtn.style.background = 'rgba(139, 92, 246, 0.15)';
                toggleFindReplaceBarBtn.style.color = '#c4b5fd';
            }
        });
    }

    ['customFindInput', 'customReplaceInput', 'gridFindInput', 'gridReplaceInput'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyFindReplace(id.startsWith('grid'));
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
        const customReplaceInput = document.getElementById('customReplaceInput');
        const matchCaseCheck = document.getElementById('matchCaseCheck');
        const useRegexCheck = document.getElementById('useRegexCheck');

        // Auto-commit any non-empty text remaining in Find input as an active rule
        if (customFindInput && customFindInput.value.trim() !== '') {
            const currentRule = {
                find: customFindInput.value,
                replace: customReplaceInput ? customReplaceInput.value : '',
                match_case: matchCaseCheck ? matchCaseCheck.checked : false,
                is_regex: useRegexCheck ? useRegexCheck.checked : false
            };

            if (editingRuleIndex !== null && editingRuleIndex < appliedRules.length) {
                appliedRules[editingRuleIndex] = currentRule;
                editingRuleIndex = null;
            } else {
                appliedRules.push(currentRule);
            }

            customFindInput.value = '';
            if (customReplaceInput) customReplaceInput.value = '';
            renderAppliedRules();
        }

        if (appliedRules.length > 0) {
            formData.append('find_replace_rules', JSON.stringify(appliedRules));
        }

        if (Object.keys(manualEdits).length > 0) {
            formData.append('manual_edits', JSON.stringify(manualEdits));
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

        updateWarningsBanner(stats.warnings);

        if (stats.columns) {
            renderColumnMapping(stats.columns, 'trColumnMappingContainer');
            renderColumnMapping(stats.columns, 'tabColumnMappingContainer');
        }

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function updateWarningsBanner(warnings) {
        const csvWarningsCard = document.getElementById('csvWarningsCard');
        const warningsCountText = document.getElementById('warningsCountText');
        const warningsListContainer = document.getElementById('warningsListContainer');
        const warningsTabBtn = document.getElementById('warningsTabBtn');
        const warningsTabBadge = document.getElementById('warningsTabBadge');
        const warningsTableBody = document.getElementById('warningsTableBody');

        if (warnings && warnings.length > 0) {
            if (csvWarningsCard) csvWarningsCard.classList.remove('hidden');
            if (warningsCountText) warningsCountText.textContent = warnings.length.toLocaleString();
            if (warningsTabBtn) warningsTabBtn.classList.remove('hidden');
            if (warningsTabBadge) warningsTabBadge.textContent = warnings.length.toLocaleString();

            if (warningsListContainer) warningsListContainer.innerHTML = '';
            if (warningsTableBody) warningsTableBody.innerHTML = '';

            warnings.forEach(w => {
                const warnMsg = w.message ? (w.message.includes(']: ') ? w.message.split(']: ')[1] : w.message) : 'Unclosed or mismatched symbol detected.';
                
                // Top Banner Item
                if (warningsListContainer) {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: rgba(0,0,0,0.25); border-left: 3px solid #f59e0b; padding: 0.35rem 0.6rem; border-radius: 4px; font-family: var(--font-mono); font-size: 0.75rem;';
                    item.innerHTML = `
                        <div><strong style="color: #fbbf24;">Row #${w.row}</strong>, Column <span class="badge" style="background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.3);">${escapeHtml(w.column)}</span>: ${escapeHtml(warnMsg)}</div>
                        <div style="color: var(--text-muted); font-size: 0.7rem; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">"<em>${escapeHtml(w.snippet)}</em>"</div>
                    `;
                    warningsListContainer.appendChild(item);
                }

                // Dedicated Tab Table Row
                if (warningsTableBody) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 700; color: #fbbf24; font-family: var(--font-mono);">Row #${w.row}</td>
                        <td><span class="badge" style="background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.3);">${escapeHtml(w.column)}</span></td>
                        <td style="color: #fef08a; font-weight: 600;">${escapeHtml(warnMsg)}</td>
                        <td><code style="background: rgba(0,0,0,0.4); padding: 0.25rem 0.5rem; border-radius: 4px; color: #f87171; font-family: var(--font-mono); font-size: 0.8125rem; white-space: pre-wrap; word-break: break-all;">${escapeHtml(w.snippet)}</code></td>
                    `;
                    warningsTableBody.appendChild(tr);
                }
            });
        } else {
            if (csvWarningsCard) csvWarningsCard.classList.add('hidden');
            if (warningsTabBtn) warningsTabBtn.classList.add('hidden');
        }
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

    function updateCellDOMContent(td, cellObj) {
        let badgeHtml = cellObj.changed ? `<span class="excel-edited-badge" title="Original text: ${escapeHtml(cellObj.original)}">✏️ EDITED</span>` : '';
        let editBtnHtml = `<button type="button" class="excel-cell-edit-trigger" title="Edit Cell">✏️ Edit</button>`;
        
        let colName = String(td._col || '').trim().toLowerCase();
        if (colName === 'title') {
            td.classList.add('excel-cell-title');
        }

        let cellTextHtml = '';
        if (cellObj.changed) {
            const diff = computeInlineDiff(cellObj.original, cellObj.cleaned);
            cellTextHtml = diff.cleanedHtml;
        } else {
            cellTextHtml = formatDiffText(cellObj.cleaned);
        }

        td.innerHTML = `
            ${editBtnHtml}
            <div class="excel-cell-content">
                ${badgeHtml}
                <div class="excel-cell-text">${cellTextHtml}</div>
            </div>
        `;

        const editBtn = td.querySelector('.excel-cell-edit-trigger');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                startEditingCell(td, td._rowItem, td._col);
            });
        }
    }

    function startEditingCell(td, rowItem, col) {
        if (td.classList.contains('is-editing')) return;
        td.classList.add('is-editing');

        const cellObj = rowItem.data[col] || { original: '', cleaned: '', changed: false };
        const currentVal = cellObj.cleaned !== undefined ? cellObj.cleaned : '';
        const origContentHtml = td.innerHTML;

        td.innerHTML = `
            <div class="excel-inline-editor-wrapper">
                <textarea class="excel-inline-editor">${escapeHtml(currentVal)}</textarea>
                <div class="excel-editor-actions">
                    <span class="excel-editor-hint">Ctrl+Enter to save • Esc to cancel</span>
                    <div class="excel-editor-btns">
                        <button type="button" class="btn-cell-cancel">Cancel</button>
                        <button type="button" class="btn-cell-save">✓ Save</button>
                    </div>
                </div>
            </div>
        `;

        const textarea = td.querySelector('.excel-inline-editor');
        const saveBtn = td.querySelector('.btn-cell-save');
        const cancelBtn = td.querySelector('.btn-cell-cancel');

        textarea.focus();
        try {
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        } catch (e) {}

        async function saveEdit() {
            const newVal = textarea.value;
            if (newVal === currentVal) {
                cancelEdit();
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Saving...';

            try {
                const resp = await fetch('/update-cell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_id: currentFileId,
                        row: rowItem.row,
                        column: col,
                        value: newVal
                    })
                });

                const resData = await resp.json();
                if (!resp.ok || resData.error) {
                    throw new Error(resData.error || 'Failed to update cell.');
                }

                const wasChanged = cellObj.changed;
                if (!cellObj.original && cellObj.original !== '') {
                    cellObj.original = currentVal;
                }
                cellObj.cleaned = newVal;
                cellObj.changed = true;
                manualEdits[`${rowItem.row}_${col}`] = newVal;

                td.classList.remove('is-editing');
                td.classList.add('excel-cell-changed');

                const tr = td.closest('tr');
                if (tr) tr.classList.add('excel-row-has-changed');

                updateCellDOMContent(td, cellObj);

                if (processedData) {
                    if (!wasChanged) {
                        processedData.cells_changed = (processedData.cells_changed || 0) + 1;
                        if (statChanged) statChanged.textContent = processedData.cells_changed.toLocaleString();
                    }

                    const existingChangeIdx = processedData.changes.findIndex(c => c.row === rowItem.row && c.column === col);
                    if (existingChangeIdx >= 0) {
                        processedData.changes[existingChangeIdx].cleaned = newVal;
                    } else {
                        processedData.changes.push({
                            row: rowItem.row,
                            column: col,
                            original: cellObj.original || '',
                            cleaned: newVal
                        });
                    }
                    changesCountBadge.textContent = processedData.changes.length.toLocaleString();

                    if (resData.cell_warnings) {
                        processedData.warnings = (processedData.warnings || []).filter(w => !(w.row === rowItem.row && w.column === col));
                        if (resData.cell_warnings.length > 0) {
                            processedData.warnings.push(...resData.cell_warnings);
                        }
                        updateWarningsBanner(processedData.warnings);
                    }

                    renderChangesTable(processedData.changes);
                    renderUnchangedTable(processedData.rows_preview, processedData.columns);
                }

            } catch (err) {
                showAlert(`Cell Save Error: ${err.message}`, 'danger');
                td.classList.remove('is-editing');
                td.innerHTML = origContentHtml;
            }
        }

        function cancelEdit() {
            td.classList.remove('is-editing');
            td.innerHTML = origContentHtml;
            const editBtn = td.querySelector('.excel-cell-edit-trigger');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startEditingCell(td, rowItem, col);
                });
            }
        }

        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveEdit();
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelEdit();
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        if (wrapper) {
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    function renderGridView(columns, rows) {
        if (!gridTableHeader || !gridTableBody) return;

        gridTableHeader.innerHTML = '';
        const headerTr = document.createElement('tr');

        let headersHtml = `<th>Row #</th>`;
        columns.forEach((col) => {
            const colLower = col.trim().toLowerCase();
            let styleAttr = '';
            if (colLower === 'title') {
                styleAttr = 'class="excel-cell-title" style="min-width: 260px; max-width: 480px;"';
            } else if (['#', 'id', 'type', 'priority', 'status'].includes(colLower)) {
                styleAttr = 'class="excel-cell-short" style="min-width: 90px; max-width: 160px;"';
            }
            headersHtml += `<th ${styleAttr}>${escapeHtml(col)}</th>`;
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

            const rowHeaderTd = document.createElement('td');
            rowHeaderTd.innerHTML = `<strong>#${rowItem.row}</strong> ${hasAnyChange ? '<span style="color:#34d399; font-size: 0.75rem;" title="Row contains formatted/edited cells">✨</span>' : ''}`;
            tr.appendChild(rowHeaderTd);

            columns.forEach(col => {
                const cellObj = rowItem.data[col] || { cleaned: '', original: '', changed: false };
                const td = document.createElement('td');
                td._rowItem = rowItem;
                td._col = col;

                const colLower = col.trim().toLowerCase();
                let extraClasses = '';
                if (colLower === 'title') extraClasses = ' excel-cell-title';
                else if (['#', 'id', 'type', 'priority', 'status'].includes(colLower)) extraClasses = ' excel-cell-short';

                td.className = (cellObj.changed ? 'excel-cell excel-cell-changed' : 'excel-cell') + extraClasses;
                updateCellDOMContent(td, cellObj);

                td.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    startEditingCell(td, rowItem, col);
                });

                tr.appendChild(td);
            });

            const actionTd = document.createElement('td');
            actionTd.className = 'excel-action-cell';
            actionTd.innerHTML = `<button type="button" class="btn-inspect-row">🔍 View Detail</button>`;
            const btnInspect = actionTd.querySelector('.btn-inspect-row');
            if (btnInspect) {
                btnInspect.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRowInspector(rowItem);
                });
            }
            tr.appendChild(actionTd);

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
            card.style.cssText = 'background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem; position: relative;';

            renderInspectorCardContent(card, rowItem, col, cellObj);
            rowDetailModalBody.appendChild(card);
        });

        rowDetailModal.classList.remove('hidden');
    }

    function renderInspectorCardContent(card, rowItem, col, cellObj) {
        let diffHtml = '';
        if (cellObj.changed) {
            const diff = computeInlineDiff(cellObj.original, cellObj.cleaned);
            diffHtml = `
                <div style="font-size: 0.75rem; color: var(--danger); font-weight: 600;">Original:</div>
                <div class="text-box original" style="font-size: 0.8125rem;">${diff.originalHtml}</div>
                <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; margin-top: 0.25rem;">Cleaned / Current:</div>
                <div class="text-box cleaned" style="font-size: 0.8125rem;">${diff.cleanedHtml}</div>
            `;
        } else {
            diffHtml = `<div class="text-box" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.8125rem;">${escapeHtml(cellObj.cleaned || '(empty)')}</div>`;
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge" style="font-size: 0.8125rem; background: var(--primary-light); color: #a5b4fc;">${escapeHtml(col)}</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${cellObj.changed ? '<span class="change-tag bullet-tag">Formatted/Edited</span>' : ''}
                    <button type="button" class="btn-edit-inspector-field" style="background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">✏️ Edit Field</button>
                </div>
            </div>
            ${diffHtml}
        `;

        const editBtn = card.querySelector('.btn-edit-inspector-field');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                startEditingInspectorField(card, rowItem, col, cellObj);
            });
        }
    }

    function startEditingInspectorField(card, rowItem, col, cellObj) {
        const currentVal = cellObj.cleaned !== undefined ? cellObj.cleaned : '';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span class="badge" style="font-size: 0.8125rem; background: var(--primary-light); color: #a5b4fc;">${escapeHtml(col)}</span>
                <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 600;">Editing Field...</span>
            </div>
            <textarea class="form-control inspector-field-textarea" style="min-height: 110px; font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.5; resize: vertical;">${escapeHtml(currentVal)}</textarea>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.35rem;">
                <button type="button" class="btn btn-cancel-inspector-edit" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); padding: 0.3rem 0.75rem; font-size: 0.8rem; border-radius: 4px;">Cancel</button>
                <button type="button" class="btn btn-save-inspector-edit" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 0.3rem 0.9rem; font-size: 0.8rem; font-weight: 600; border-radius: 4px;">✓ Save Field</button>
            </div>
        `;

        const textarea = card.querySelector('.inspector-field-textarea');
        const saveBtn = card.querySelector('.btn-save-inspector-edit');
        const cancelBtn = card.querySelector('.btn-cancel-inspector-edit');

        textarea.focus();

        cancelBtn.addEventListener('click', () => {
            renderInspectorCardContent(card, rowItem, col, cellObj);
        });

        saveBtn.addEventListener('click', async () => {
            const newVal = textarea.value;
            if (newVal === currentVal) {
                renderInspectorCardContent(card, rowItem, col, cellObj);
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Saving...';

            try {
                const resp = await fetch('/update-cell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_id: currentFileId,
                        row: rowItem.row,
                        column: col,
                        value: newVal
                    })
                });

                const resData = await resp.json();
                if (!resp.ok || resData.error) {
                    throw new Error(resData.error || 'Failed to save field edit.');
                }

                const wasChanged = cellObj.changed;
                if (!cellObj.original && cellObj.original !== '') {
                    cellObj.original = currentVal;
                }
                cellObj.cleaned = newVal;
                cellObj.changed = true;
                manualEdits[`${rowItem.row}_${col}`] = newVal;

                renderInspectorCardContent(card, rowItem, col, cellObj);

                if (processedData) {
                    if (!wasChanged) {
                        processedData.cells_changed = (processedData.cells_changed || 0) + 1;
                        if (statChanged) statChanged.textContent = processedData.cells_changed.toLocaleString();
                    }

                    const existingChangeIdx = processedData.changes.findIndex(c => c.row === rowItem.row && c.column === col);
                    if (existingChangeIdx >= 0) {
                        processedData.changes[existingChangeIdx].cleaned = newVal;
                    } else {
                        processedData.changes.push({
                            row: rowItem.row,
                            column: col,
                            original: cellObj.original || '',
                            cleaned: newVal
                        });
                    }
                    changesCountBadge.textContent = processedData.changes.length.toLocaleString();

                    if (resData.cell_warnings) {
                        processedData.warnings = (processedData.warnings || []).filter(w => !(w.row === rowItem.row && w.column === col));
                        if (resData.cell_warnings.length > 0) {
                            processedData.warnings.push(...resData.cell_warnings);
                        }
                        updateWarningsBanner(processedData.warnings);
                    }

                    renderChangesTable(processedData.changes);
                    renderUnchangedTable(processedData.rows_preview, processedData.columns);
                    renderGridView(processedData.columns, processedData.rows_preview);
                }
            } catch (err) {
                showAlert(`Field Edit Error: ${err.message}`, 'danger');
                renderInspectorCardContent(card, rowItem, col, cellObj);
            }
        });
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
            if (warningsView) warningsView.classList.add('hidden');

            if (targetView === 'grid' && gridView) gridView.classList.remove('hidden');
            if (targetView === 'changes' && changesView) changesView.classList.remove('hidden');
            if (targetView === 'unchanged' && unchangedView) unchangedView.classList.remove('hidden');
            if (targetView === 'warnings' && warningsView) warningsView.classList.remove('hidden');
        });
    });

    // Grid View Mode Toggles (Compact Rows vs Full Text Rows vs Fit Screen Height)
    const gridCompactBtn = document.getElementById('gridCompactBtn');
    const gridExpandedBtn = document.getElementById('gridExpandedBtn');
    const gridFitScreenBtn = document.getElementById('gridFitScreenBtn');

    if (gridCompactBtn && gridExpandedBtn && gridView) {
        gridCompactBtn.addEventListener('click', () => {
            gridView.classList.add('compact-mode');
            gridCompactBtn.classList.add('active');
            gridCompactBtn.style.background = 'var(--primary)';
            gridCompactBtn.style.color = 'white';

            gridExpandedBtn.classList.remove('active');
            gridExpandedBtn.style.background = 'transparent';
            gridExpandedBtn.style.color = 'var(--text-secondary)';
        });

        gridExpandedBtn.addEventListener('click', () => {
            gridView.classList.remove('compact-mode');
            const expandedCells = gridView.querySelectorAll('.excel-cell.is-expanded');
            expandedCells.forEach(c => c.classList.remove('is-expanded'));

            gridExpandedBtn.classList.add('active');
            gridExpandedBtn.style.background = 'var(--primary)';
            gridExpandedBtn.style.color = 'white';

            gridCompactBtn.classList.remove('active');
            gridCompactBtn.style.background = 'transparent';
            gridCompactBtn.style.color = 'var(--text-secondary)';
        });
    }

    if (gridFitScreenBtn && gridView) {
        gridFitScreenBtn.addEventListener('click', () => {
            const isFit = gridView.classList.toggle('fit-screen-mode');
            if (changesView) changesView.classList.toggle('fit-screen-mode', isFit);
            if (unchangedView) unchangedView.classList.toggle('fit-screen-mode', isFit);
            if (warningsView) warningsView.classList.toggle('fit-screen-mode', isFit);

            if (isFit) {
                gridFitScreenBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
                gridFitScreenBtn.style.color = 'white';
                gridFitScreenBtn.style.boxShadow = '0 0 12px var(--primary-glow)';
            } else {
                gridFitScreenBtn.style.background = 'rgba(99, 102, 241, 0.12)';
                gridFitScreenBtn.style.color = '#a5b4fc';
                gridFitScreenBtn.style.boxShadow = 'none';
            }
        });
    }

    // Grid View Fullscreen Mode Toggle
    const gridFullscreenBtn = document.getElementById('gridFullscreenBtn');

    function toggleFullscreenMode(forceState) {
        if (!resultsSection) return;
        const isFullscreen = typeof forceState === 'boolean' 
            ? forceState 
            : !resultsSection.classList.contains('fullscreen-active');

        if (isFullscreen) {
            resultsSection.classList.add('fullscreen-active');
            document.body.style.overflow = 'hidden';
            if (gridFullscreenBtn) {
                gridFullscreenBtn.innerHTML = '<span>❌ Thoát Toàn Màn Hình</span>';
                gridFullscreenBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                gridFullscreenBtn.style.color = 'white';
                gridFullscreenBtn.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.4)';
            }
        } else {
            resultsSection.classList.remove('fullscreen-active');
            document.body.style.overflow = '';
            if (gridFullscreenBtn) {
                gridFullscreenBtn.innerHTML = '<span>⛶ Toàn Màn Hình</span>';
                gridFullscreenBtn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.2))';
                gridFullscreenBtn.style.color = '#6ee7b7';
                gridFullscreenBtn.style.boxShadow = 'none';
            }
        }
    }

    if (gridFullscreenBtn) {
        gridFullscreenBtn.addEventListener('click', () => toggleFullscreenMode());
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && resultsSection && resultsSection.classList.contains('fullscreen-active')) {
            toggleFullscreenMode(false);
        }
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
