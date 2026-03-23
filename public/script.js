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

    analyzeBtn.addEventListener('click', async () => {
        const text = contractTextarea.value.trim();

        if (!text && !currentFile) {
            alert('Please enter some contract text or upload a file to analyze.');
            return;
        }

        analyzeBtn.classList.add('analyzing');
        analyzeBtn.disabled = true;

        try {
            let response;
            if (currentFile) {
                const formData = new FormData();
                formData.append('file', currentFile);

                response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Analysis failed');
            }

            const data = await response.json();
            currentReport = data;
            renderFastAPIResults(data);
            downloadBtn.classList.remove('hidden');
            viewChartBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Error analyzing contract:', error);
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

    function renderFastAPIResults(data) {
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