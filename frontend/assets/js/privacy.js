/**
 * Privacy & Security Features
 * Handles Data Export and Account Deletion
 */

class PrivacyManager {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/privacy';
    }

    async exportData() {
        try {
            const btn = document.getElementById('btnExportData');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Exporting...';
            btn.disabled = true;

            const response = await fetch(`${this.apiBase}/export`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `finbuddy_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                alert('Data exported successfully!');
            } else {
                throw new Error('Export failed');
            }

            btn.innerHTML = originalText;
            btn.disabled = false;
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data. Please try again.');
            document.getElementById('btnExportData').disabled = false;
        }
    }

    async deleteAccount() {
        const confirmed = confirm("⚠️ CRITICAL WARNING ⚠️\n\nAre you sure you want to delete ALL your data?\nThis action cannot be undone. All transactions and settings will be lost forever.");

        if (!confirmed) return;

        const doubleCheck = prompt("To confirm deletion, please type 'DELETE' below:");

        if (doubleCheck !== 'DELETE') {
            alert("Deletion cancelled. Input did not match.");
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/account`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Account deleted successfully. Redirecting to home...');
                window.location.reload(); // Reloads page, which should now be empty/reset
            } else {
                throw new Error('Deletion failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete account. Please try again.');
        }
    }
}

const privacyManager = new PrivacyManager();
