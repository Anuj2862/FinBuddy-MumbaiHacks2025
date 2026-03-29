// frontend/assets/js/index.js – FIXED + STABLE VERSION

document.addEventListener('DOMContentLoaded', () => {
    const parseBtn = document.getElementById('parseBtn');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const loader = document.getElementById('parseLoader');
    const btnText = parseBtn.querySelector('.btn-text');

    // Subtle entrance animation for main input card and quick links
    const inputCard = document.querySelector('.input-card');
    const quickNav = document.querySelector('.quick-navigation');
    if (inputCard) {
        inputCard.classList.add('animate-scale-in');
    }
    if (quickNav) {
        quickNav.classList.add('animate-fade-in-delayed');
    }

    parseBtn.addEventListener('click', async () => {
        console.log("🚀 Parse button clicked");

        hideResult();
        hideError();

        const smsInput = document.getElementById('smsText');
        const text = smsInput.value.trim();
        if (!text) {
            showError("Please enter SMS text.");
            // brief shake animation when empty
            smsInput.classList.add('is-invalid');
            smsInput.style.animation = 'shake 0.25s linear';
            setTimeout(() => {
                smsInput.style.animation = '';
                smsInput.classList.remove('is-invalid');
            }, 260);
            return;
        }

        setLoading(true);

        try {
            const apiUrl = "/api/transactions/from-sms";
            const token = localStorage.getItem('token');
            
            console.log("🔑 Token size check:", token ? token.length : 0);
            if (!token) {
                console.warn("⚠️ No token found. Redirecting to login...");
                window.location.href = '/';
                return;
            }

            console.log("📡 Sending POST:", apiUrl);
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            });

            console.log(`📨 HTTP: ${response.status} ${response.statusText}`);

            const raw = await response.text();
            console.log("📨 RAW (500 chars):", raw.substring(0, 500));

            // ----------- VALIDATE JSON -----------
            let data;
            if (!response.headers.get("content-type")?.includes("application/json")) {
                throw new Error(`Non-JSON response: ${raw.substring(0, 200)}`);
            }

            try {
                data = JSON.parse(raw);
            } catch (e) {
                console.error("❌ JSON parse failed");
                throw new Error("Invalid JSON returned from server");
            }

            if (!response.ok) {
                console.error("❌ Server Error:", data);
                return showError(
                    data.detail ||
                    data.error ||
                    `Backend Error: HTTP ${response.status}`
                );
            }

            console.log("✅ Parsed Transactions:", data);
            
            if (data.transactions && data.transactions.length > 0) {
                displayBulkResult(data);
                setTimeout(() => (window.location.href = "/dashboard"), 3000);
            } else if (data.id) { // Fallback for single legacy response
                displayResult(data);
                setTimeout(() => (window.location.href = "/dashboard"), 2000);
            } else {
                throw new Error("No successful transactions parsed.");
            }

        } catch (err) {
            console.error("❌ FETCH ERROR:", err);
            showError(err.message || "Unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    });

    // ----------------------------------------------
    // UI HELPERS
    // ----------------------------------------------

    function setLoading(isLoading) {
        if (isLoading) {
            parseBtn.disabled = true;
            loader.classList.remove("d-none");
            btnText.textContent = "Processing...";
        } else {
            parseBtn.disabled = false;
            loader.classList.add("d-none");
            btnText.innerHTML = '<i class="fas fa-save me-2"></i>Parse & Save Transaction';
        }
    }

    function hideResult() {
        resultDiv.classList.add("d-none");
        resultDiv.innerHTML = "";
    }

    function hideError() {
        errorDiv.classList.add("d-none");
        errorDiv.innerHTML = "";
    }

    function showError(message) {
        errorDiv.classList.remove("d-none");
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        `;
    }

    // ----------------------------------------------
    // DISPLAY RESULT CARD
    // ----------------------------------------------

    function displayBulkResult(data) {
        resultDiv.classList.remove("d-none");
        resultDiv.classList.add("animate-slide-up", "pulse-soft");

        let html = `
            <h5 class="text-primary mb-3">
                <i class="fas fa-check-circle me-2"></i>Successfully Parsed ${data.total_parsed} Transaction(s)
            </h5>
            ${data.total_failed > 0 ? `<div class="alert alert-warning mb-3">Failed to parse ${data.total_failed} lines.</div>` : ''}
            
            <div class="transaction-list" style="max-height: 400px; overflow-y: auto;">
        `;

        data.transactions.forEach(txn => {
            const txnTypeClass = txn.txn_type === "Credited" ? "bg-success" : "bg-danger";
            const txnTypeIcon = txn.txn_type === "Credited" ? "fa-arrow-up" : "fa-arrow-down";
            
            html += `
                <div class="border rounded p-3 mb-3 bg-light-subtle">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>ID:</strong> <code>${txn.id ? txn.id.substring(0, 8) + "..." : "N/A"}</code></p>
                            <p class="mb-1"><strong>Type:</strong> <span class="badge ${txnTypeClass}"><i class="fas ${txnTypeIcon} me-1"></i>${txn.txn_type}</span></p>
                            <p class="mb-1"><strong>Amount:</strong> <span class="fw-bold ${txnTypeClass === "bg-success" ? "text-success" : "text-danger"}">₹${Number(txn.amount).toLocaleString("en-IN")}</span></p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Category:</strong> <span class="badge bg-secondary">${txn.category || "N/A"}</span></p>
                            <p class="mb-1"><strong>Counterparty:</strong> ${txn.counterparty || "Unknown"}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div class="alert alert-info mt-3 mb-0">
                <i class="fas fa-circle-notch fa-spin me-2"></i>
                Saving and redirecting to Dashboard...
            </div>
        `;
        
        resultDiv.innerHTML = html;
    }

    function displayResult(data) {
        resultDiv.classList.remove("d-none");
        resultDiv.classList.add("animate-slide-up", "pulse-soft");

        const txnTypeClass = data.txn_type === "Credited" ? "bg-success" : "bg-danger";
        const txnTypeIcon = data.txn_type === "Credited" ? "fa-arrow-up" : "fa-arrow-down";

        let alertHtml = "";
        if (data.compliance_alert) {
            const alertClass =
                data.compliance_alert.includes("CRITICAL") ? "alert-danger" : "alert-warning";

            alertHtml = `
                <div class="alert ${alertClass} mb-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>${data.compliance_alert}
                </div>
            `;
        }

        resultDiv.innerHTML = `
            <h5 class="text-primary mb-3">
                <i class="fas fa-check-circle me-2"></i>Transaction Saved Successfully!
            </h5>

            ${alertHtml}

            <div class="row">
                <div class="col-md-6">
                    <p><strong>Transaction ID:</strong>
                        <code>${data.id ? data.id.substring(0, 8) + "..." : "N/A"}</code>
                    </p>

                    <p><strong>Type:</strong>
                        <span class="badge ${txnTypeClass}">
                            <i class="fas ${txnTypeIcon} me-1"></i>
                            ${data.txn_type}
                        </span>
                    </p>

                    <p><strong>Amount:</strong>
                        <span class="fw-bold fs-5 ${txnTypeClass === "bg-success" ? "text-success" : "text-danger"}">
                            ₹${Number(data.amount).toLocaleString("en-IN")}
                        </span>
                    </p>
                </div>

                <div class="col-md-6">
                    <p><strong>Category:</strong>
                        <span class="badge bg-secondary">${data.category || "N/A"}</span>
                    </p>
                    <p><strong>Counterparty:</strong> ${data.counterparty || "Unknown"}</p>
                </div>
            </div>

            <div class="ai-insight-item mt-3">
                <strong><i class="fas fa-lightbulb me-2"></i>AI Insight:</strong>
                ${data.ai_insight || "No insight generated."}
            </div>

            <p class="mt-3 text-muted">
                <strong>Original Message:</strong>
                <em>${data.message}</em>
            </p>

            <div class="alert alert-info mt-3">
                <i class="fas fa-arrow-right me-2"></i>
                Redirecting to Dashboard...
            </div>
        `;
    }
});
