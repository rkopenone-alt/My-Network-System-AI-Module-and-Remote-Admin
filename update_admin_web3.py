import re

filepath = 'C:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/raw_admin.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Extract declinedBy
pattern_extract = re.compile(r"(let assignedTo = 'Unassigned';.*?assignedTo = \\`Group \\\$\{r\.assigned_group_id\}\\`;\s*\})", re.DOTALL)
match = pattern_extract.search(content)
if match:
    old_extract_found = match.group(1)
    new_extract = old_extract_found + """
                
                let declinedBy = '-';
                let declinedMatches = (r.details || '').match(/\\\\[Declined by Rescuer ID: (.*?)\\\\]/g);
                if (declinedMatches) {
                    declinedBy = declinedMatches.map(m => m.replace(/\\\\[Declined by Rescuer ID: |\\\\]/g, '')).join(', ');
                }"""
    content = content.replace(old_extract_found, new_extract)
    print("Updated extraction logic")
else:
    print("extraction replacement failed")

# 3. Update RowHtml templates
pattern_row = re.compile(r"(<td>\\\$\{assignedTo\}</td>\s*<td style=\"color:var\(--text-muted\); font-size: 12px;\">\\\$\{formattedReqTime\}</td>)", re.DOTALL)
match_row = pattern_row.search(content)
if match_row:
    old_row_found = match_row.group(1)
    new_row = """<td>\\${assignedTo}</td>
                      <td style="color:#ef4444; font-weight:600; font-size:12px;">\\${declinedBy}</td>
                      <td style="color:var(--text-muted); font-size: 12px;">\\${formattedReqTime}</td>"""
    content = content.replace(old_row_found, new_row)
    print("Updated RowHtml templates")
else:
    print("RowHtml replacement failed")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished modifying raw_admin.html")
