import re

filepath = 'C:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/raw_admin.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update tableHeader
old_tableHeader = '''<th style="width: 150px;">ASSIGNED TO</th>'''
new_tableHeader = '''<th style="width: 150px;">ASSIGNED TO</th>
                  <th style="width: 150px;">DECLINED BY</th>'''
if old_tableHeader in content:
    content = content.replace(old_tableHeader, new_tableHeader)
    print('Updated tableHeader')
else:
    print('tableHeader replacement failed')

# 2. Extract declinedBy
# We must find the exact block for assignedTo in raw_admin.html
# In the original, it was:
old_extract = """                let assignedTo = 'Unassigned';
                if (r.assigned_officer_name) {
                    assignedTo = `dY`  ${r.assigned_officer_name}`;
                } else if (r.assigned_group_name) {
                    assignedTo = `dY`  ${r.assigned_group_name}`;
                } else if (r.assigned_user_id) {
                    assignedTo = `Rescuer ${r.assigned_user_id}`;
                }"""
                
# But wait, raw_admin.html comes from JSON.parse(), so the `dY` character is probably `👤` and `👥` but mangled by powershell stdout!
# Let's search using regex!
import re

pattern_extract = re.compile(r"(let assignedTo = 'Unassigned';.*?assignedTo = `Rescuer \$\{r\.assigned_user_id\}`;)", re.DOTALL)
match = pattern_extract.search(content)
if match:
    old_extract_found = match.group(1)
    new_extract = old_extract_found + """
                
                let declinedBy = '-';
                let declinedMatches = (r.details || '').match(/\\[Declined by Rescuer ID: (.*?)\\]/g);
                if (declinedMatches) {
                    declinedBy = declinedMatches.map(m => m.replace(/\\[Declined by Rescuer ID: |\\]/g, '')).join(', ');
                }"""
    content = content.replace(old_extract_found, new_extract)
    print("Updated extraction logic")
else:
    print("extraction replacement failed")

# 3. Update liveRowHtml and historyRowHtml
# Because the line contains \${assignedTo} and \${formattedReqTime} instead of ${...} because of JS escaping!
pattern_row = re.compile(r"(<td>\$\{assignedTo\}</td>\s*<td style=\"color:var\(--text-muted\); font-size: 12px;\">\$\{formattedReqTime\}</td>)", re.DOTALL)
match_row = pattern_row.search(content)
if match_row:
    old_row_found = match_row.group(1)
    new_row = """<td>${assignedTo}</td>
                    <td style="color:#ef4444; font-weight:600; font-size:12px;">${declinedBy}</td>
                    <td style="color:var(--text-muted); font-size: 12px;">${formattedReqTime}</td>"""
    content = content.replace(old_row_found, new_row)
    print("Updated RowHtml templates")
else:
    print("RowHtml replacement failed")

# 4. Wrap tables in responsive divs

old_table1 = '''                        <table style="width:100%;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyCritical"></tbody>
                        </table>'''
new_table1 = '''                        <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                        <table style="width:100%; min-width: 1500px;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyCritical"></tbody>
                        </table>
                        </div>'''
content = content.replace(old_table1, new_table1)

old_table2 = '''                        <table style="width:100%;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyNormal"></tbody>
                        </table>'''
new_table2 = '''                        <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                        <table style="width:100%; min-width: 1500px;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyNormal"></tbody>
                        </table>
                        </div>'''
content = content.replace(old_table2, new_table2)

old_table3 = '''                        <table style="width:100%;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyGrouped"></tbody>
                        </table>'''
new_table3 = '''                        <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                        <table style="width:100%; min-width: 1500px;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="liveCmdBodyGrouped"></tbody>
                        </table>
                        </div>'''
content = content.replace(old_table3, new_table3)

old_table4 = '''                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyCritical"></tbody>
                    </table>'''
new_table4 = '''                    <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                    <table style="width: 100%; min-width: 1500px; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyCritical"></tbody>
                    </table>
                    </div>'''
content = content.replace(old_table4, new_table4)

old_table5 = '''                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyNormal"></tbody>
                    </table>'''
new_table5 = '''                    <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                    <table style="width: 100%; min-width: 1500px; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyNormal"></tbody>
                    </table>
                    </div>'''
content = content.replace(old_table5, new_table5)

old_table6 = '''                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyGrouped"></tbody>
                    </table>'''
new_table6 = '''                    <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                    <table style="width: 100%; min-width: 1500px; border-collapse: collapse;">
                        <thead style="background: white; border-bottom: 1px solid var(--border);">
                            <tr>
                                <!-- Populated by JS -->
                            </tr>
                        </thead>
                        <tbody id="historyTbodyGrouped"></tbody>
                    </table>
                    </div>'''
content = content.replace(old_table6, new_table6)

old_table7 = '''                        <table style="width:100%;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="compCmdBody"></tbody>
                        </table>'''
new_table7 = '''                        <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
                        <table style="width:100%; min-width: 1500px;">
                            <thead>
                                <tr>
                                    <!-- Populated by JS -->
                                </tr>
                            </thead>
                            <tbody id="compCmdBody"></tbody>
                        </table>
                        </div>'''
content = content.replace(old_table7, new_table7)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished modifying raw_admin.html")
