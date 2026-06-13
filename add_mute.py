import os

file_path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

func = """
<script>
function toggleGlobalMute(muted) {
    window.isMuted = muted;
    const btn = document.getElementById('globalMuteBtn');
    if (btn) {
        btn.dataset.muted = window.isMuted.toString();
        if (window.isMuted) {
            btn.style.backgroundColor = "#ef4444";
            btn.innerHTML = '<i data-lucide="volume-x" style="width:18px; margin-right:6px;"></i> SOUND OFF';
        } else {
            btn.style.backgroundColor = "#22c55e";
            btn.innerHTML = '<i data-lucide="volume-2" style="width:18px; margin-right:6px;"></i> SOUND ON';
        }
        if (window.lucide) window.lucide.createIcons();
    }
}
</script>
"""

content = content.replace("</body>", func + "\n</body>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added toggleGlobalMute")
