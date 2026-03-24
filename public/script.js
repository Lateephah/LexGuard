document.addEventListener('DOMContentLoaded', () => {
    // Global variable for the chart instance
    let riskChartInstance = null;

    // View Management Logic
    const heroLanding = document.getElementById('hero-landing');
    const heroCtaBtn = document.getElementById('hero-cta-btn');
    const landingView = document.getElementById('landing-view');
    const analyzerView = document.getElementById('analyzer-view');
    const continueBtn = document.getElementById('continue-btn');

    heroCtaBtn.addEventListener('click', () => {
        heroLanding.classList.add('hidden');
        landingView.classList.remove('hidden');
    });

    continueBtn.addEventListener('click', () => {
        landingView.classList.add('hidden');
        analyzerView.classList.remove('hidden');
    });

    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const contractTextarea = document.getElementById('contract-text');
    const summaryCards = document.getElementById('summary-cards');
    const clausesContainer = document.getElementById('clauses-container');
    const downloadBtn = document.getElementById('download-btn');
    const viewChartBtn = document.getElementById('view-chart-btn');
    const chartModal = document.getElementById('chart-modal');
    const chartCloseBtn = document.getElementById('chart-close-btn');

    // Upload elements
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');

    let currentFile = null;
    let currentReport = null;

    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    function handleFileSelection(file) {
        const validExtensions = ['.txt', '.pdf'];
        const fileName = file.name.toLowerCase();
        if (validExtensions.some(ext => fileName.endsWith(ext))) {
            currentFile = file;
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            contractTextarea.value = '';
        } else {
            alert('Invalid file type. Please upload a .txt or .pdf file.');
        }
    }

    contractTextarea.addEventListener('input', () => {
        if (contractTextarea.value.trim().length > 0) {
            currentFile = null;
            fileNameDisplay.textContent = '';
            fileInput.value = '';
        }
    });

    // --- RISK ANALYSIS DATA & LOGIC (Ported from Python) ---
    const RULES = {
        "Anti-Assignment": ["assign.*this.*agreement", "write.*the.*prior.*written.*consent", "write.*the.*other.*party", "assign.*neither.*party", "assign.*its.*rights", "write.*this.*agreement", "assign.*any", "assign.*either.*party", "hereunder.*obligations", "write.*prior.*written.*consent"],
        "Cap On Liability": ["advise.*the.*possibility", "relate.*this.*agreement", "include.*negligence", "arise.*this.*agreement", "include.*contract", "arise.*connection", "lose.*lost.*profits", "punitive.*damages", "give.*rise", "include.*damages"],
        "Termination For Convenience": ["terminate.*this.*agreement", "write.*notice", "terminate.*either.*party", "write.*written.*notice", "terminate.*any.*time", "write.*prior.*written.*notice", "write.*the.*other.*party", "terminate.*the.*right", "have.*the.*right", "write.*any.*time"],
        "Exclusivity": ["have.*the.*exclusive.*right", "sell.*market", "offer.*sale", "set.*this.*agreement", "sublicense.*the.*right", "include.*limitation", "grant.*the.*right", "grant.*sublicenses", "set.*the.*terms", "sell.*the.*exclusive.*right"],
        "Minimum Commitment": ["terminate.*this.*agreement", "agree.*the.*parties", "write.*written.*notice", "have.*the.*right", "follow.*the.*following.*dates", "terminate.*the.*right", "fail.*the.*event", "follow.*july", "detect.*delay", "receive.*it"],
        "Audit Rights": ["have.*the.*right", "verify.*the.*accuracy", "audit.*the.*audited.*party", "audit.*records", "inspect.*the.*right", "audit.*the.*right", "have.*we", "write.*written.*notice", "conduct.*the.*right", "agree.*the.*parties"],
        "Ip Ownership Assignment": ["make.*hire", "assign.*the.*company", "agree.*you", "agree.*the.*term", "provide.*services", "terminate.*this.*agreement", "compete.*which", "approve.*writing", "compete.*the.*business", "offer.*which", "reverse.*auctions"],
        "Uncapped Liability": ["advise.*the.*possibility", "include.*negligence", "relate.*this.*agreement", "lose.*lost.*profits", "punitive.*damages", "include.*contract", "arise.*liability", "advise.*such.*party", "arise.*this.*agreement", "arise.*damages"],
        "Revenue/Profit Sharing": ["pay.*verticalnet", "pay.*licensee", "share.*the.*parties", "pay.*a.*royalty", "pay.*paperexchange", "earn.*licensee", "ship.*\\*", "set.*section", "pay.*neoforma", "pay.*a.*commission"],
        "License Grant": ["use.*the.*right", "offer.*sale", "make.*use", "grant.*this.*agreement", "grant.*the.*right", "sell.*sale", "include.*the.*right", "have.*the.*right", "sell.*use", "sublicense.*the.*right"],
        "Change Of Control": ["terminate.*this.*agreement", "assign.*this.*agreement", "write.*written.*notice", "have.*the.*right", "write.*this.*agreement", "provide.*this.*agreement", "undergo.*control", "write.*the.*prior.*written.*consent", "write.*the.*other.*party", "provide.*services"],
        "Liquidated Damages": ["liquidate.*liquidated.*damages", "terminate.*this.*agreement", "liquidate.*the.*liquidated.*damages", "pay.*party.*b", "liquidate.*party.*b", "pay.*the.*liquidated.*damages", "terminate.*the.*agreement", "pay.*customer", "entitle.*party.*a", "request.*party.*b"],
        "Rofr/Rofo/Rofn": ["write.*written.*notice", "have.*the.*right", "provide.*written.*notice", "enter.*an.*agreement", "negotiate.*good.*faith", "exercise.*its.*option", "include.*which", "provide.*bii", "write.*it", "set.*section"],
        "Insurance": ["maintain.*the.*term", "maintain.*each.*party", "maintain.*its.*own.*expense", "maintain.*this.*agreement", "maintain.*insurance", "maintain.*operator", "include.*limitation", "provide.*coverage", "require.*this.*agreement", "maintain.*full.*force"],
        "Non-Compete": ["have.*any.*interest", "agree.*you", "agree.*the.*term", "provide.*services", "terminate.*this.*agreement", "compete.*which", "approve.*writing", "compete.*the.*business", "offer.*which", "reverse.*auctions"],
        "Affiliate License-Licensee": ["grant.*sublicenses", "grant.*the.*licenses", "have.*the.*right", "permit.*its.*affiliates", "include.*the.*right", "grant.*the.*right", "permit.*america", "grant.*ginkgo", "use.*the.*right", "grant.*licensee"],
        "No-Solicit Of Employees": ["employ.*who", "employ.*any.*person", "agree.*the.*term", "write.*the.*prior.*written.*consent", "solicit.*employment", "leave.*his.*or.*her.*employment", "induce.*any.*employee", "agree.*you", "solicit.*any.*employee", "seek.*who"],
        "Non-Disparagement": ["terminate.*this.*agreement", "make.*that", "have.*the.*right", "terminate.*the.*right", "do.*anything", "reflect.*that", "give.*distributor", "agree.*it", "have.*tendency", "file.*any.*document"]
    };

    const SEVERITY_MAPPING = {
        "Uncapped Liability": "High", "Minimum Commitment": "High", "Termination For Convenience": "High", "Exclusivity": "High", "Non-Compete": "High", "Ip Ownership Assignment": "High", "Liquidated Damages": "High",
        "Audit Rights": "Medium", "Revenue/Profit Sharing": "Medium", "Anti-Assignment": "Medium", "Cap On Liability": "Medium", "Volume Restriction": "Medium", "Rofr/Rofo/Rofn": "Medium", "Change Of Control": "Medium", "No-Solicit Of Employees": "Medium", "No-Solicit Of Customers": "Medium",
        "Warranty Duration": "Low", "Non-Disparagement": "Low", "Joint Ip Ownership": "Low", "License Grant": "Low", "Insurance": "Low"
    };

    const WARNING_MESSAGES = {
        "Anti-Assignment": "This clause may require attention. It restricts your ability to transfer or assign the contract to another entity.",
        "Cap On Liability": "This clause limits the total financial claim you can make against the other party.",
        "Termination For Convenience": "This allows a party to end the contract without cause, creating operational uncertainty.",
        "Exclusivity": "This restricts you from working with other vendors or clients in the same category.",
        "Minimum Commitment": "This forces a minimum spend or volume requirement, creating financial pressure.",
        "Ip Ownership Assignment": "This clause involves the transfer of your intellectual property rights to the other party.",
        "Uncapped Liability": "This exposes you to unlimited financial damages if something goes wrong.",
        "Non-Compete": "This prevents you from working with competitors for a specific period."
    };

    // Helper: PDF Text Extractor
    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
        }
        return text;
    }

    // Helper: Local Risk Analysis Engine
    function performAnalysisLocal(text) {
        const textLower = text.toLowerCase();
        const clausesInternal = text.split('\n\n').map(c => c.trim()).filter(c => c);
        const segments = clausesInternal.length > 0 ? clausesInternal : [text.trim()];

        const flags = [];
        const triggered = new Set();
        const weights = { "High": 3, "Medium": 2, "Low": 1 };

        segments.forEach(origClause => {
            const clauseLower = origClause.toLowerCase();
            for (const [category, patterns] of Object.entries(RULES)) {
                patterns.forEach(patternStr => {
                    const regex = new RegExp(patternStr, 'gi');
                    let match;
                    while ((match = regex.exec(clauseLower)) !== null) {
                        const severity = SEVERITY_MAPPING[category] || "Medium";
                        const message = WARNING_MESSAGES[category] || `Warning detected in ${category}.`;
                        const color = severity === "High" ? "red" : (severity === "Medium" ? "yellow" : "green");
                        
                        flags.push({
                            clause: category,
                            severity: severity,
                            traffic_light: color,
                            message: message,
                            matched_pattern: origClause.substring(match.index, match.index + match[0].length)
                        });
                        triggered.add(category);
                    }
                });
            }
        });

        // Calculate scores
        let actualScore = 0;
        let maxPossible = 0;
        
        // Sum weights of all potentially detectable categories for normalized score
        Object.keys(RULES).forEach(cat => {
            maxPossible += weights[SEVERITY_MAPPING[cat] || "Medium"];
        });
        triggered.forEach(cat => {
            actualScore += weights[SEVERITY_MAPPING[cat] || "Medium"];
        });

        const normalizedScore = Math.max(0, Math.min(Math.round((actualScore / Math.max(maxPossible, 1)) * 100), 100));
        const overall = normalizedScore <= 30 ? "Low" : (normalizedScore <= 70 ? "Medium" : "High");

        const riskCounts = { "High": 0, "Medium": 0, "Low": 0 };
        flags.forEach(f => riskCounts[f.severity]++);

        return {
            flags,
            overall_risk: overall,
            summary: `${riskCounts.High || 0} high-risk clauses detected.`,
            risk_score: normalizedScore,
            risk_counts: riskCounts
        };
    }

    analyzeBtn.addEventListener('click', async () => {
        let text = contractTextarea.value.trim();

        if (!text && !currentFile) {
            alert('Please enter some contract text or upload a file to analyze.');
            return;
        }

        analyzeBtn.classList.add('analyzing');
        analyzeBtn.disabled = true;

        try {
            // New logic: Check if we need to extract from file first
            if (currentFile) {
                if (currentFile.name.toLowerCase().endsWith('.pdf')) {
                    text = await extractTextFromPDF(currentFile);
                } else {
                    text = await currentFile.text();
                }
            }

            if (!text || !text.trim()) {
                throw new Error("No readable text found in input.");
            }

            // Perform analysis locally (Pure JS)
            const analysisData = performAnalysisLocal(text);
            currentReport = analysisData;
            
            // Display results
            renderAnalysisResults(analysisData);
            
            downloadBtn.classList.remove('hidden');
            viewChartBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Error in local analysis:', error);
            alert(`An error occurred: ${error.message}`);
        } finally {
            analyzeBtn.classList.remove('analyzing');
            analyzeBtn.disabled = false;
        }
    });

    clearBtn.addEventListener('click', () => {
        contractTextarea.value = '';
        currentFile = null;
        currentReport = null;
        fileNameDisplay.textContent = '';
        fileInput.value = '';
        summaryCards.classList.add('hidden');
        downloadBtn.classList.add('hidden');
        viewChartBtn.classList.add('hidden');
        clausesContainer.innerHTML = `
            <div class="empty-message">
                <i>📄</i>
                <p>Submit a contract to see risk analysis</p>
            </div>
        `;
        clausesContainer.classList.add('empty-state');
    });

    downloadBtn.addEventListener('click', () => {
        if (!currentReport) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentReport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "lexguard_report.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    const resultModal = document.getElementById('result-modal');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    modalCloseBtn.addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });

    function showModal(type, title, message) {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        if (type === 'high') {
            modalIcon.innerHTML = '🚨';
            modalTitle.style.color = 'var(--danger)';
        } else if (type === 'medium') {
            modalIcon.innerHTML = '⚠️';
            modalTitle.style.color = 'var(--warning)';
        } else {
            modalIcon.innerHTML = '🎉';
            modalTitle.style.color = 'var(--info)';
        }
        resultModal.classList.remove('hidden');
    }

    // --- CHART FUNCTION ---
    function renderChart(counts) {
        const ctx = document.getElementById('riskChart').getContext('2d');

        if (riskChartInstance) {
            riskChartInstance.destroy();
        }

        const high = counts.High || 0;
        const medium = counts.Medium || 0;
        const low = counts.Low || 0;
        const total = high + medium + low;

        riskChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                datasets: [{
                    data: [high, medium, low],
                    backgroundColor: ['#e07a5f', '#f2cc8f', '#81b29a'],
                    hoverBackgroundColor: ['#d4654a', '#e6bb7a', '#6fa388'],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(74, 60, 49, 0.9)',
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter' },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '62%',
                animation: {
                    animateRotate: true,
                    duration: 800
                }
            }
        });

        // Custom legend with percentages
        const legendEl = document.getElementById('chart-legend');
        const pctHigh = total > 0 ? ((high / total) * 100).toFixed(1) : 0;
        const pctMedium = total > 0 ? ((medium / total) * 100).toFixed(1) : 0;
        const pctLow = total > 0 ? ((low / total) * 100).toFixed(1) : 0;

        const items = [
            { label: `High Risk — ${pctHigh}%`, color: '#e07a5f' },
            { label: `Medium Risk — ${pctMedium}%`, color: '#f2cc8f' },
            { label: `Low Risk — ${pctLow}%`, color: '#81b29a' }
        ];
        legendEl.innerHTML = items.map(item => `
            <div class="chart-legend-item">
                <span class="chart-legend-dot" style="background: ${item.color};"></span>
                ${item.label}
            </div>
        `).join('');
    }

    // View Chart button opens modal
    viewChartBtn.addEventListener('click', () => {
        if (!currentReport) return;
        chartModal.classList.remove('hidden');
        // Render fresh each time modal opens so canvas sizes correctly
        setTimeout(() => {
            renderChart(currentReport.risk_counts || { High: 0, Medium: 0, Low: 0 });
        }, 50);
    });

    chartCloseBtn.addEventListener('click', () => {
        chartModal.classList.add('hidden');
    });

    function renderAnalysisResults(data) {
        if (data.overall_risk === 'High') {
            showModal('high', 'High Risk Detected!', `Found <strong>${data.risk_counts ? data.risk_counts.High : 0} High-Risk</strong> clauses.`);
        } else if (data.overall_risk === 'Medium') {
            showModal('medium', 'Proceed with Caution', `Relatively standard, but some medium-risk clauses were flagged.`);
        } else {
            showModal('low', 'Looking Great!', `Risk score is low (<strong>${data.risk_score}%</strong>). 🎉`);
        }

        summaryCards.classList.remove('hidden');
        let headerColor = 'var(--border-color)';
        if (data.overall_risk === 'High') headerColor = 'var(--danger)';
        else if (data.overall_risk === 'Medium') headerColor = 'var(--warning)';
        else if (data.overall_risk === 'Low') headerColor = 'var(--info)';

        const counts = data.risk_counts || { High: 0, Medium: 0, Low: 0 };

        summaryCards.innerHTML = `
            <div class="card" style="grid-column: span 3; border-color: ${headerColor}; padding-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <div class="card-label" style="text-transform: uppercase; text-align: left;">Overall Risk Level</div>
                        <div class="card-value" style="color: ${headerColor}; text-align: left; font-size: 2rem;">${data.overall_risk}</div>
                    </div>
                    <div>
                        <div class="card-label" style="text-transform: uppercase; text-align: right;">Risk Score</div>
                        <div class="card-value" style="color: var(--primary); text-align: right; font-size: 2.5rem;">${data.risk_score}%</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div class="card risk-high" id="filter-high" style="box-shadow: none; cursor: pointer; transition: all 0.3s;">
                        <div class="card-value" style="color: #fff; font-size: 1.5rem;">${counts.High || 0}</div>
                        <div class="card-label" style="color: #fff;">High Risks</div>
                    </div>
                    <div class="card risk-medium" id="filter-medium" style="box-shadow: none; cursor: pointer; transition: all 0.3s;">
                        <div class="card-value" style="color: #1a1a1a; font-size: 1.5rem;">${counts.Medium || 0}</div>
                        <div class="card-label" style="color: #1a1a1a;">Medium Risks</div>
                    </div>
                    <div class="card risk-low" id="filter-low" style="box-shadow: none; cursor: pointer; transition: all 0.3s;">
                        <div class="card-value" style="color: #fff; font-size: 1.5rem;">${counts.Low || 0}</div>
                        <div class="card-label" style="color: #fff;">Low Risks</div>
                    </div>
                </div>
                <div id="filter-status" style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted); text-align: center; font-style: italic;">
                    Click any risk level above to filter the results.
                </div>
            </div>
        `;

        let currentFilter = null;
        const btnHigh = document.getElementById('filter-high');
        const btnMedium = document.getElementById('filter-medium');
        const btnLow = document.getElementById('filter-low');
        const statusText = document.getElementById('filter-status');

        function updateFilterVisuals() {
            const filters = [
                { btn: btnHigh, type: 'High' },
                { btn: btnMedium, type: 'Medium' },
                { btn: btnLow, type: 'Low' }
            ];

            filters.forEach(f => {
                // Remove both classes first
                f.btn.classList.remove('filter-dimmed', 'filter-active');

                if (currentFilter) {
                    if (f.type === currentFilter) {
                        f.btn.classList.add('filter-active');
                    } else {
                        f.btn.classList.add('filter-dimmed');
                    }
                }
            });
        }

        function renderFlags() {
            clausesContainer.innerHTML = '';
            clausesContainer.classList.remove('empty-state');
            updateFilterVisuals();

            let filteredFlags = data.flags;
            if (currentFilter) {
                filteredFlags = data.flags.filter(f => f.severity === currentFilter);
                statusText.innerHTML = `Showing <strong>${currentFilter} Risk</strong> only. <span id="clear-filter-btn" style="color: var(--primary); text-decoration: underline; cursor: pointer; margin-left: 0.5rem;">Clear</span>`;

                document.getElementById('clear-filter-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentFilter = null;
                    renderFlags();
                });
            } else {
                statusText.innerHTML = 'Click any risk level above to filter the results.';
            }

            if (!filteredFlags || filteredFlags.length === 0) {
                clausesContainer.innerHTML = `<div class="empty-message"><p>No ${currentFilter || ''} risks detected.</p></div>`;
                return;
            }

            filteredFlags.forEach((flag, index) => {
                const clauseEl = document.createElement('div');
                clauseEl.className = 'clause-item';
                clauseEl.style.animationDelay = `${index * 0.05}s`;
                const severityClass = flag.severity.toLowerCase();

                clauseEl.innerHTML = `
                    <div class="risk-tag tag-${severityClass}" style="flex-direction: column; width: 100%;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                            <div style="display: flex; align-items: center;">
                                <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${flag.traffic_light}; margin-right: 8px;"></span>
                                <span class="risk-badge" style="margin-right:0.5rem">${flag.severity}</span>
                                <strong>${flag.clause}</strong>
                            </div>
                        </div>
                        <p style="color: var(--text-main); font-style: italic; background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem;"><span class="highlight-match">"${flag.matched_pattern}"</span></p>
                        <p style="color: var(--text-muted);">${flag.message}</p>
                    </div>
                `;
                clausesContainer.appendChild(clauseEl);
            });
        }

        btnHigh.addEventListener('click', () => { currentFilter = (currentFilter === 'High' ? null : 'High'); renderFlags(); });
        btnMedium.addEventListener('click', () => { currentFilter = (currentFilter === 'Medium' ? null : 'Medium'); renderFlags(); });
        btnLow.addEventListener('click', () => { currentFilter = (currentFilter === 'Low' ? null : 'Low'); renderFlags(); });

        renderFlags();
    }
});