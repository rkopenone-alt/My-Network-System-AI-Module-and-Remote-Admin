import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def create_report():
    doc = Document()

    # --- STYLE SETUP ---
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Calibri'
    font_normal.size = Pt(11)
    font_normal.color.rgb = RGBColor(50, 50, 50)

    style_title = doc.styles['Title']
    font_title = style_title.font
    font_title.name = 'Segoe UI'
    font_title.size = Pt(28)
    font_title.bold = True
    font_title.color.rgb = RGBColor(0, 51, 102)
    
    style_h1 = doc.styles['Heading 1']
    font_h1 = style_h1.font
    font_h1.name = 'Segoe UI'
    font_h1.size = Pt(18)
    font_h1.bold = True
    font_h1.color.rgb = RGBColor(0, 102, 204)

    style_h2 = doc.styles['Heading 2']
    font_h2 = style_h2.font
    font_h2.name = 'Segoe UI'
    font_h2.size = Pt(14)
    font_h2.bold = True
    font_h2.color.rgb = RGBColor(0, 153, 204)

    style_h3 = doc.styles['Heading 3']
    font_h3 = style_h3.font
    font_h3.name = 'Segoe UI'
    font_h3.size = Pt(12)
    font_h3.bold = True
    font_h3.color.rgb = RGBColor(0, 128, 128)
    
    # --- TITLE PAGE ---
    doc.add_paragraph('\n\n\n\n\n\n')
    title = doc.add_paragraph('ARDMS', style='Title')
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = doc.add_paragraph('Advanced Rescue & Disaster Management System\nProject Report and User Manual', style='Subtitle')
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.runs[0].font.color.rgb = RGBColor(100, 100, 100)
    doc.add_paragraph('\n\n\n\n\n\n\n\n\n\n\n\n\n')
    doc.add_page_break()

    def h1(text): doc.add_heading(text, level=1)
    def h2(text): doc.add_heading(text, level=2)
    def h3(text): doc.add_heading(text, level=3)
    def p(text): doc.add_paragraph(text)
    def b(text): doc.add_paragraph(text, style='List Bullet')

    # --- CONTENT ---
    h1("A. Abstract")
    p("The Advanced Rescue & Disaster Management System (ARDMS) is a complete digital solution designed to save lives during emergencies. It connects people in danger directly with nearby rescue teams and a central command center. By utilizing real-time GPS tracking, instant SOS alerts, and smart task grouping, ARDMS eliminates the confusion and delays typically seen during natural disasters or medical emergencies. This project provides a Web Admin Dashboard for operators, a Public App for victims to ask for help, and a Rescuer App for first responders to navigate exactly where they are needed.")

    h1("B. Introduction")
    p("When a disaster strikes - like a flood, earthquake, or severe medical emergency - every single second matters. Unfortunately, traditional phone calls to emergency numbers can get jammed, and explaining your exact location can be difficult when you are in a panic.")
    p("ARDMS solves this problem by using the technology already in our pockets: smartphones. With ARDMS, a person just has to press a single SOS button. Instantly, their exact GPS coordinates, the type of emergency, and their details are sent to a live Web Dashboard. An operator immediately sees this on a map and dispatches a registered Rescuer to that exact spot. The system acts as a digital bridge between those who need help and those who can provide it.")

    h1("C. Project Description")
    p("ARDMS is composed of three main pieces working together simultaneously:")
    b("1. The Public App: A mobile application for everyday people.")
    b("2. The Rescuer App: A mobile application for emergency responders.")
    b("3. The Web Admin Dashboard: A website for the central command team.")

    doc.add_page_break()
    h1("D. Technical Workflow & System Architecture")
    p("The system runs on a modern, real-time technology stack. It uses React Native for the mobile apps, React.js for the Web Dashboard, and a Node.js/SQLite backend for the database. Everything communicates instantly using WebSockets.")

    h2("1. Master Full Image (System Overview)")
    p("Below is the complete animated flow of the system. It traces the signal from the Public App triggering an SOS, to the Admin Dashboard dispatching it, directly to the Rescuer App accepting it.")
    try:
        doc.add_picture('master_flow.png', width=Inches(6.5))
    except Exception as e:
        pass

    h2("2. Detailed Operational Flow")
    p("1. Victim opens Public App and taps 'Medical Emergency'.")
    p("2. App waits 3 seconds, captures GPS, and POSTs data to Server.")
    p("3. Server saves to Database and alerts Web Admin.")
    p("4. Admin sees a flashing Red Alert on their map.")
    p("5. Admin clicks the alert, selects Rescuer 'John', and clicks 'Assign'.")
    p("6. John's Rescuer App rings. John clicks 'Accept'.")
    p("7. John follows the blue navigation line on his map to the victim.")
    p("8. Victim sees John's vehicle icon moving toward them on their screen.")
    p("9. John arrives, helps the victim, clicks 'Complete', and the alert turns green on the Admin dashboard.")

    doc.add_page_break()
    
    # --- NEW COMPREHENSIVE USER MANUAL ---
    h1("E. Comprehensive Step-by-Step User Manual")
    p("This section provides detailed functional instructions for operating each interface within the ARDMS ecosystem.")

    # E.1 Public App
    h2("E.1 Public Mobile App Guide")
    
    h3("Feature 1: Triggering an Emergency SOS")
    p("When a victim faces a crisis, they use the Public App Home screen to dispatch a signal.")
    b("Step 1: Open the ARDMS Public App on the mobile device.")
    b("Step 2: Identify the nature of the emergency from the main screen.")
    b("Step 3: Tap the corresponding button (e.g., 'Medical Emergency', 'Flood Rescue', or 'Fire Emergency').")
    try:
        doc.add_picture('public_home.png', width=Inches(2.5))
    except Exception: pass

    h3("Feature 2: Live Tracking the Rescue")
    p("Once an SOS is triggered, the system begins broadcasting the victim's GPS location.")
    b("Step 1: A 3-second countdown will begin to prevent accidental taps.")
    b("Step 2: If not canceled, the app connects to the Node.js server and transmits precise latitude/longitude.")
    b("Step 3: The screen transitions to the live map, waiting for Admin assignment.")
    b("Step 4: If the situation resolves, the victim can tap 'Cancel SOS' at the bottom of the screen.")
    try:
        doc.add_picture('public_sos.png', width=Inches(2.5))
    except Exception: pass

    doc.add_page_break()

    # E.2 Admin Dashboard
    h2("E.2 Web Admin Dashboard Guide")
    
    h3("Feature 1: Single Task Dispatch (Call Assign)")
    p("The operator uses the dispatch panel to match an emergency with a rescuer.")
    b("Step 1: A flashing red marker appears on the Live Monitoring Map indicating a new SOS.")
    b("Step 2: The left sidebar displays the emergency details (e.g., Victim ID, Emergency Type).")
    b("Step 3: Click the 'Select Rescuer' dropdown to view all online rescuer units sorted by proximity.")
    b("Step 4: Select the closest available unit.")
    b("Step 5: Click the 'Dispatch Unit' button to send the mission payload to the Rescuer App.")
    try:
        doc.add_picture('admin_assign.png', width=Inches(5.5))
    except Exception: pass

    h3("Feature 2: Tactical Grouping (Public Details Grouped Supplies)")
    p("During large-scale disasters, the operator can group multiple victims into a single tactical run for supply drops or mass evacuation.")
    b("Step 1: Identify a cluster of SOS markers on the map (e.g., multiple households in a flood zone).")
    b("Step 2: Use the cursor to draw a selection box around the targeted markers.")
    b("Step 3: The sidebar upgrades to a 'Grouped Supplies Request' panel.")
    b("Step 4: Specify the necessary logistics (e.g., Water x20, Blankets x10).")
    b("Step 5: Click 'Assign Group Task' to dispatch a multi-waypoint route to a heavy-duty rescuer unit.")
    try:
        doc.add_picture('admin_group.png', width=Inches(5.5))
    except Exception: pass

    doc.add_page_break()

    # E.3 Rescuer App
    h2("E.3 Rescuer Mobile App Guide")
    
    h3("Feature 1: Accepting a Mission")
    p("Rescuers use the mobile app to receive and accept orders from the command center.")
    b("Step 1: When the Admin dispatches a unit, the Rescuer's phone rings loudly and flashes an 'INCOMING MISSION' alert.")
    b("Step 2: The screen displays the emergency type, distance to victim, and estimated time of arrival.")
    b("Step 3: The Rescuer taps the large green 'ACCEPT TASK' button to lock in the mission.")
    b("Step 4: If unable to respond, they tap 'Decline' to route the task back to the Admin.")
    try:
        doc.add_picture('rescuer_accept.png', width=Inches(2.5))
    except Exception: pass

    h3("Feature 2: Navigation & Tracking Performance")
    p("Once accepted, the app acts as a highly technical GPS navigator.")
    b("Step 1: The map instantly draws a dashed routing line from the Rescuer's blue marker to the Victim's red marker.")
    b("Step 2: The top panel displays turn-by-turn directions.")
    b("Step 3: As the Rescuer drives, their GPS coordinates are actively streamed to the Server and the Victim's phone.")
    b("Step 4: Upon physical arrival, the Rescuer provides aid and taps 'MARK COMPLETED' at the bottom of the screen.")
    try:
        doc.add_picture('rescuer_nav.png', width=Inches(2.5))
    except Exception: pass

    h3("Feature 3: Reviewing Mission History")
    p("Rescuers can review their performance and past logs.")
    b("Step 1: Tap the far-right icon on the bottom navigation bar (NIB) to open the Mission History.")
    b("Step 2: View the chronologically ordered list of completed tasks.")
    b("Step 3: Each panel displays the task type, date, and exact completion timestamp.")
    try:
        doc.add_picture('rescuer_history.png', width=Inches(2.5))
    except Exception: pass

    # --- NEW TASK & MAP WORKFLOW SECTIONS ---
    doc.add_page_break()
    h1("F. Task Lifecycle Workflow")
    p("Every emergency requested by the Public App becomes a 'Task' in the ARDMS system. A Task follows a strict operational lifecycle to ensure no emergency is left unresolved.")
    b("State 1: PENDING - The moment an SOS is triggered, a database record is created. It appears as a flashing red alert on the Admin Dashboard.")
    b("State 2: DISPATCHED - Once the Admin selects a Rescuer and clicks 'Dispatch', the payload is pushed to the Rescuer's device.")
    b("State 3: IN-PROGRESS - When the Rescuer hits 'ACCEPT TASK', the status changes. The routing line is drawn, and the ETA begins counting down.")
    b("State 4: COMPLETED - Upon arriving at the scene and resolving the crisis, the Rescuer presses 'MARK COMPLETED'. The task is cleared from the active map and securely logged into the History Database.")

    h1("G. Dynamic Map & Routing Workflow")
    p("The mapping system is the visual core of ARDMS, providing real-time geographical awareness.")
    b("1. Initial Geolocation: The Public App uses native GPS modules to lock onto high-accuracy coordinates (Latitude/Longitude) before transmitting the SOS payload.")
    b("2. Admin Plotting: The Node.js server receives these coordinates and instantly plots a Red Emergency Marker on the Web Dashboard's live map.")
    b("3. Routing Calculation: Upon task assignment, the Rescuer App queries routing APIs to draw a blue tactical path linking their current location to the victim's location.")
    b("4. Live Telemetry Sync: As the Rescuer physically moves, their phone pulses updated coordinates every few seconds via WebSockets. The server reflects this movement, visibly animating the Rescuer's icon advancing along the route on both the Admin's screen and the Victim's screen.")

    file_path = os.path.join(os.getcwd(), 'ARDMS_Project_Report_User_Manual_v6.docx')
    doc.save(file_path)
    print(f"Docx saved to {file_path}")

if __name__ == "__main__":
    create_report()
