/**
 * ============================================================
 *  EMPLOYEE ATTENDANCE MANAGEMENT SYSTEM
 *  Free — Google Sheets + Apps Script
 * ============================================================
 *  SETUP INSTRUCTIONS:
 *  1. Go to sheets.google.com → create a new blank spreadsheet
 *  2. Click Extensions > Apps Script
 *  3. Delete the default code, paste this entire file
 *  4. Edit the CONFIGURATION section below (names, email, timezone)
 *  5. Click Run > setup()  (first time will ask for permissions — Allow all)
 *  6. Copy the 3 form links from the popup and share with employees
 * ============================================================
 */

// ============================================================
//  CONFIGURATION — Edit before running setup()
// ============================================================
const EMPLOYEES   = ['Employee 1', 'Employee 2', 'Employee 3']; // Real names here
const ADMIN_EMAIL = 'your@gmail.com';   // Your Gmail address
const TIMEZONE    = 'Asia/Karachi';     // Change if needed: Asia/Kolkata, America/New_York, etc.
const WORK_START  = 9;   // Expected check-in hour (24h) — used for punctuality scoring
const WORK_END    = 18;  // Expected check-out hour — used to auto-mark absent after this hour
const STANDARD_HOURS = 8; // Expected hours per working day

// ============================================================
//  SHEET NAME CONSTANTS — do not change
// ============================================================
const SH = {
  ATT:   'Attendance',
  LEAVE: 'Leave_Requests',
  DASH:  'Dashboard',
  CFG:   '_Config'
};

// ============================================================
//  SETUP — Run this ONCE after pasting the code
// ============================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create sheets
  [SH.ATT, SH.LEAVE, SH.DASH, SH.CFG].forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });

  _setupAttendanceSheet(ss);
  _setupLeaveSheet(ss);

  // Create the 3 forms
  const urls = _createForms(ss);

  // Save URLs to config sheet
  const cfg = ss.getSheetByName(SH.CFG);
  cfg.clearContents();
  cfg.getRange('A1:B4').setValues([
    ['Check-In Form',  urls.checkIn],
    ['Check-Out Form', urls.checkOut],
    ['Leave Form',     urls.leave],
    ['Admin Email',    ADMIN_EMAIL]
  ]);

  // Set up automatic triggers
  _setupTriggers(ss);

  // Build initial (empty) dashboard
  updateDashboard();

  // Show form links to admin
  SpreadsheetApp.getUi().alert(
    '✅ Setup complete!\n\n' +
    'Share these links with your 3 employees:\n\n' +
    '📥 CHECK-IN FORM:\n' + urls.checkIn + '\n\n' +
    '📤 CHECK-OUT FORM:\n' + urls.checkOut + '\n\n' +
    '🏖 LEAVE REQUEST FORM:\n' + urls.leave + '\n\n' +
    'Bookmark them on employee phones.'
  );
}

// ============================================================
//  FORM CREATION
// ============================================================
function _createForms(ss) {
  const ssId = ss.getId();

  // ── CHECK-IN FORM ──────────────────────────────────────────
  const ci = FormApp.create('📥 Check-In — Daily Attendance');
  ci.setDescription('Fill this form when you START work each day.');
  ci.setConfirmationMessage('Checked in successfully! Have a productive day.');

  ci.addListItem()
    .setTitle('Your Name')
    .setChoiceValues(EMPLOYEES)
    .setRequired(true);

  ci.addParagraphTextItem()
    .setTitle("Today's planned tasks")
    .setHelpText('List each task on a separate line. Be specific.\nExample:\nFinish report\nCall client X\nUpdate spreadsheet')
    .setRequired(true);

  ci.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);

  // ── CHECK-OUT FORM ─────────────────────────────────────────
  const co = FormApp.create('📤 Check-Out — Daily Attendance');
  co.setDescription('Fill this form when you END work each day.');
  co.setConfirmationMessage('Checked out. Great work today! See you tomorrow.');

  co.addListItem()
    .setTitle('Your Name')
    .setChoiceValues(EMPLOYEES)
    .setRequired(true);

  co.addParagraphTextItem()
    .setTitle('Tasks COMPLETED today')
    .setHelpText('List each task you finished today, one per line.')
    .setRequired(true);

  co.addParagraphTextItem()
    .setTitle('Tasks carried forward to tomorrow')
    .setHelpText('List any unfinished tasks. Leave blank if none.');

  co.addParagraphTextItem()
    .setTitle('Work summary / notes')
    .setHelpText('Brief description of what you accomplished. Optional.');

  co.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);

  // ── LEAVE REQUEST FORM ─────────────────────────────────────
  const lv = FormApp.create('🏖 Leave Request');
  lv.setDescription('Submit this form to request a leave day. Admin will approve/reject.');
  lv.setConfirmationMessage('Leave request submitted. Waiting for admin approval.');

  lv.addListItem()
    .setTitle('Your Name')
    .setChoiceValues(EMPLOYEES)
    .setRequired(true);

  lv.addDateItem()
    .setTitle('Leave Date')
    .setRequired(true);

  lv.addListItem()
    .setTitle('Leave Type')
    .setChoiceValues(['Sick Leave', 'Personal Leave', 'Annual Leave'])
    .setRequired(true);

  lv.addParagraphTextItem()
    .setTitle('Reason')
    .setRequired(true);

  lv.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);

  return {
    checkIn:  ci.getPublishedUrl(),
    checkOut: co.getPublishedUrl(),
    leave:    lv.getPublishedUrl()
  };
}

// ============================================================
//  TRIGGERS
// ============================================================
function _setupTriggers(ss) {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // All form submissions routed through one handler
  ScriptApp.newTrigger('processFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // Daily job: mark absent employees + refresh dashboard
  ScriptApp.newTrigger('dailyTasks')
    .timeBased()
    .everyDays(1)
    .atHour(WORK_END + 1)
    .create();
}

// ============================================================
//  FORM SUBMIT ROUTER
// ============================================================
function processFormSubmit(e) {
  const sheetName = e.range.getSheet().getName().toLowerCase();

  if      (sheetName.includes('check-in'))  processCheckIn(e);
  else if (sheetName.includes('check-out')) processCheckOut(e);
  else if (sheetName.includes('leave'))     processLeaveRequest(e);
}

// ============================================================
//  CHECK-IN HANDLER
// ============================================================
function processCheckIn(e) {
  const nv       = e.namedValues;
  const ts       = new Date(e.values[0]);
  const employee = nv['Your Name'][0];
  const tasks    = nv["Today's planned tasks"][0];
  const today    = _date(ts);
  const timeStr  = _time(ts);

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SH.ATT);
  const row   = _findOrCreateRow(sheet, today, employee);

  // Calculate punctuality (1–100): full marks if on time, deducted per minute late
  const expectedStart = new Date(ts);
  expectedStart.setHours(WORK_START, 0, 0, 0);
  const lateMinutes   = Math.max(0, (ts - expectedStart) / 60000);
  const punctuality   = Math.max(0, Math.round(100 - lateMinutes * 0.5)); // -0.5 per minute late

  sheet.getRange(row, 3).setValue(timeStr);   // Check-In Time
  sheet.getRange(row, 6).setValue(tasks);     // Tasks Planned
  sheet.getRange(row, 12).setValue('Present');
  sheet.getRange(row, 13).setValue(punctuality); // Punctuality score

  updateDashboard();
}

// ============================================================
//  CHECK-OUT HANDLER
// ============================================================
function processCheckOut(e) {
  const nv        = e.namedValues;
  const ts        = new Date(e.values[0]);
  const employee  = nv['Your Name'][0];
  const completed = nv['Tasks COMPLETED today'][0];
  const carriedFw = (nv['Tasks carried forward to tomorrow'] || [''])[0];
  const summary   = (nv['Work summary / notes'] || [''])[0];
  const today     = _date(ts);
  const timeStr   = _time(ts);

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SH.ATT);
  const row   = _findOrCreateRow(sheet, today, employee);

  // Hours worked
  const checkInStr = sheet.getRange(row, 3).getValue();
  let hoursWorked = '', hourEff = '';
  if (checkInStr) {
    const inMs  = _parseTime(today, checkInStr);
    const outMs = ts.getTime();
    hoursWorked = ((outMs - inMs) / 3600000).toFixed(2);
    hourEff     = Math.min(100, Math.round((parseFloat(hoursWorked) / STANDARD_HOURS) * 100));
  }

  // Task efficiency
  const planned = sheet.getRange(row, 6).getValue();
  let taskEff = '';
  if (planned) {
    const plannedCount   = _countLines(planned);
    const completedCount = _countLines(completed);
    taskEff = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;
  }

  sheet.getRange(row, 4).setValue(timeStr);    // Check-Out Time
  sheet.getRange(row, 5).setValue(hoursWorked);// Hours Worked
  sheet.getRange(row, 7).setValue(completed);  // Tasks Completed
  sheet.getRange(row, 8).setValue(carriedFw);  // Carried Forward
  sheet.getRange(row, 9).setValue(summary);    // Summary
  sheet.getRange(row, 10).setValue(taskEff);   // Task Efficiency %
  sheet.getRange(row, 11).setValue(hourEff);   // Hour Efficiency %

  updateDashboard();
}

// ============================================================
//  LEAVE REQUEST HANDLER
// ============================================================
function processLeaveRequest(e) {
  const nv       = e.namedValues;
  const ts       = new Date(e.values[0]);
  const employee = nv['Your Name'][0];
  const leaveDate = nv['Leave Date'][0];
  const leaveType = nv['Leave Type'][0];
  const reason    = nv['Reason'][0];

  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const leaveSheet = ss.getSheetByName(SH.LEAVE);
  const attSheet   = ss.getSheetByName(SH.ATT);

  // Add to leave sheet (admin will change Status to Approved/Rejected)
  leaveSheet.appendRow([
    _date(ts) + ' ' + _time(ts),
    employee,
    typeof leaveDate === 'string' ? leaveDate : _date(new Date(leaveDate)),
    leaveType,
    reason,
    'Pending ⏳',
    ''
  ]);

  // Pre-mark in attendance as Leave (will show as Approved Leave once admin approves)
  const leaveDateStr = typeof leaveDate === 'string' ? leaveDate : _date(new Date(leaveDate));
  const row = _findOrCreateRow(attSheet, leaveDateStr, employee);
  attSheet.getRange(row, 12).setValue('Leave (Pending)');

  // Notify admin by email
  try {
    GmailApp.sendEmail(
      ADMIN_EMAIL,
      '📋 Leave Request: ' + employee,
      employee + ' has requested ' + leaveType + ' on ' + leaveDateStr + '.\n\nReason: ' + reason +
      '\n\nPlease update the "Leave_Requests" sheet Status column to Approved or Rejected.'
    );
  } catch (err) {
    // Email notification optional — won't break the system
  }

  updateDashboard();
}

// ============================================================
//  DAILY AUTOMATIC TASKS (runs after WORK_END each day)
// ============================================================
function dailyTasks() {
  markAbsent();
  updateDashboard();
}

function markAbsent() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const attSheet  = ss.getSheetByName(SH.ATT);
  const lvSheet   = ss.getSheetByName(SH.LEAVE);
  const today     = _date(new Date());
  const dayOfWeek = new Date().getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends

  // Collect employees on approved leave today
  const lvData = lvSheet.getDataRange().getValues();
  const onLeave = new Set();
  for (let i = 1; i < lvData.length; i++) {
    const ld     = lvData[i][2] ? (typeof lvData[i][2] === 'string' ? lvData[i][2] : _date(new Date(lvData[i][2]))) : '';
    const status = (lvData[i][5] || '').toLowerCase();
    if (ld === today && !status.includes('reject')) onLeave.add(lvData[i][1]);
  }

  // Find who already has a row for today
  const attData = attSheet.getDataRange().getValues();
  const hasRow  = new Set();
  for (let i = 1; i < attData.length; i++) {
    const rd = attData[i][0] ? _date(new Date(attData[i][0])) : '';
    if (rd === today) hasRow.add(attData[i][1]);
  }

  // Add Absent row for employees with no record and not on leave
  EMPLOYEES.forEach(emp => {
    if (!hasRow.has(emp) && !onLeave.has(emp)) {
      attSheet.appendRow([today, emp, '', '', '', '', '', '', '', '', '', 'Absent', '']);
    }
  });
}

// ============================================================
//  DASHBOARD & RANKINGS
// ============================================================
function updateDashboard() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName(SH.DASH) || ss.insertSheet(SH.DASH);
  dash.clearContents();
  dash.clearFormats();

  const attData = ss.getSheetByName(SH.ATT).getDataRange().getValues();

  // Aggregate stats per employee
  const stats = {};
  EMPLOYEES.forEach(e => {
    stats[e] = {
      present: 0, leave: 0, absent: 0, totalDays: 0,
      hours: 0, taskEffSum: 0, taskEffN: 0,
      hourEffSum: 0, hourEffN: 0,
      punctualitySum: 0, punctualityN: 0
    };
  });

  for (let i = 1; i < attData.length; i++) {
    const emp    = attData[i][1];
    const status = (attData[i][11] || '').toString();
    if (!stats[emp]) continue;

    stats[emp].totalDays++;

    if (status === 'Present') {
      stats[emp].present++;
      stats[emp].hours += parseFloat(attData[i][4]) || 0;

      const tE = parseFloat(attData[i][10]);
      if (!isNaN(tE)) { stats[emp].taskEffSum += tE; stats[emp].taskEffN++; }

      const hE = parseFloat(attData[i][11 - 1]); // col 11 = index 10
      if (!isNaN(hE)) { stats[emp].hourEffSum += hE; stats[emp].hourEffN++; }

      const p  = parseFloat(attData[i][12]);
      if (!isNaN(p))  { stats[emp].punctualitySum += p; stats[emp].punctualityN++; }

    } else if (status.toLowerCase().includes('leave')) {
      stats[emp].leave++;
    } else if (status === 'Absent') {
      stats[emp].absent++;
    }
  }

  // Compute ranking scores
  const rows = EMPLOYEES.map(emp => {
    const s = stats[emp];
    const workableDays = s.present + s.absent; // exclude leaves from denominator
    const attScore  = workableDays > 0 ? Math.round((s.present / workableDays) * 100) : 100;
    const taskScore = s.taskEffN  > 0  ? Math.round(s.taskEffSum  / s.taskEffN)  : 0;
    const hourScore = s.hourEffN  > 0  ? Math.round(s.hourEffSum  / s.hourEffN)  : 0;
    const punctScore= s.punctualityN > 0 ? Math.round(s.punctualitySum / s.punctualityN) : 100;
    // Composite: 35% attendance, 35% task eff, 20% hour eff, 10% punctuality
    const composite = Math.round(attScore*0.35 + taskScore*0.35 + hourScore*0.20 + punctScore*0.10);

    return { emp, workingDays: s.present, leaveDays: s.leave, absentDays: s.absent,
             totalHours: s.hours.toFixed(1), attScore, taskScore, hourScore, punctScore, composite };
  });

  rows.sort((a, b) => b.composite - a.composite);

  // ── Write Dashboard ─────────────────────────────────────────
  const now = Utilities.formatDate(new Date(), TIMEZONE, 'dd MMM yyyy, HH:mm');

  // Title
  dash.getRange('A1:J1').mergeAcross();
  dash.getRange('A1').setValue('EMPLOYEE ATTENDANCE & PERFORMANCE DASHBOARD');
  dash.getRange('A1').setFontSize(14).setFontWeight('bold')
    .setBackground('#1a73e8').setFontColor('#ffffff').setHorizontalAlignment('center');

  dash.getRange('A2:J2').mergeAcross();
  dash.getRange('A2').setValue('Last updated: ' + now)
    .setFontStyle('italic').setHorizontalAlignment('center').setBackground('#e8f0fe');

  // Headers
  const headers = [['Rank','Employee','Working Days\n(excl. leaves)','Leave Days','Absent Days',
                     'Total Hours','Attendance %','Task Eff. %','Hour Eff. %','Score /100']];
  dash.getRange('A4:J4').setValues(headers);
  dash.getRange('A4:J4').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff')
    .setWrap(true).setHorizontalAlignment('center');

  // Rank rows
  const MEDALS = ['🥇', '🥈', '🥉'];
  rows.forEach((r, i) => {
    const rowNum = 5 + i;
    const data   = [
      MEDALS[i] || (i + 1),
      r.emp,
      r.workingDays,
      r.leaveDays,
      r.absentDays,
      r.totalHours,
      r.attScore  + '%',
      r.taskScore + '%',
      r.hourScore + '%',
      r.composite
    ];
    dash.getRange(rowNum, 1, 1, 10).setValues([data]);

    const bg = i === 0 ? '#fff9c4' : i === 1 ? '#f5f5f5' : '#fbe9e7';
    dash.getRange(rowNum, 1, 1, 10).setBackground(bg).setHorizontalAlignment('center');
    dash.getRange(rowNum, 2).setHorizontalAlignment('left').setFontWeight('bold');

    // Color-code score
    const scoreCell = dash.getRange(rowNum, 10);
    scoreCell.setFontWeight('bold');
    if (r.composite >= 80) scoreCell.setFontColor('#0d652d');
    else if (r.composite >= 60) scoreCell.setFontColor('#e65100');
    else scoreCell.setFontColor('#c62828');
  });

  // ── Scoring Legend ───────────────────────────────────────────
  dash.getRange('A' + (5 + rows.length + 1) + ':J' + (5 + rows.length + 1)).mergeAcross();
  dash.getRange('A' + (5 + rows.length + 1))
    .setValue('Score = 35% Attendance + 35% Task Efficiency + 20% Hour Efficiency + 10% Punctuality')
    .setFontStyle('italic').setFontColor('#666666').setHorizontalAlignment('center');

  dash.autoResizeColumns(1, 10);
}

// ============================================================
//  SHEET INITIALIZERS
// ============================================================
function _setupAttendanceSheet(ss) {
  const sh = ss.getSheetByName(SH.ATT);
  sh.clearContents();
  const headers = [
    'Date','Employee','Check-In','Check-Out','Hours Worked',
    'Tasks Planned','Tasks Completed','Tasks Carried Forward','Summary',
    'Task Eff. %','Hour Eff. %','Status','Punctuality Score'
  ];
  sh.getRange(1,1,1,headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

function _setupLeaveSheet(ss) {
  const sh = ss.getSheetByName(SH.LEAVE);
  sh.clearContents();
  const headers = ['Submitted On','Employee','Leave Date','Leave Type','Reason','Status','Admin Note'];
  sh.getRange(1,1,1,headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#0f9d58').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('F2:F1000').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending ⏳','Approved ✅','Rejected ❌'])
      .build()
  );
}

// ============================================================
//  HELPER UTILITIES
// ============================================================
function _date(d) {
  return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}
function _time(d) {
  return Utilities.formatDate(d, TIMEZONE, 'HH:mm');
}
function _parseTime(dateStr, timeStr) {
  return new Date(dateStr + 'T' + timeStr + ':00').getTime();
}
function _countLines(text) {
  return (text || '').split('\n').filter(l => l.trim().length > 0).length;
}
function _findOrCreateRow(sheet, dateStr, employee) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rd = data[i][0] ? _date(new Date(data[i][0])) : '';
    if (rd === dateStr && data[i][1] === employee) return i + 1;
  }
  // Not found — create new row
  const newRow = new Array(13).fill('');
  newRow[0] = dateStr;
  newRow[1] = employee;
  sheet.appendRow(newRow);
  return sheet.getLastRow();
}

// ============================================================
//  ADMIN UTILITIES (run manually from Apps Script editor)
// ============================================================

/** Run anytime to refresh the Dashboard sheet manually */
function refreshDashboard() {
  updateDashboard();
  SpreadsheetApp.getUi().alert('Dashboard refreshed!');
}

/** Get form share links (in case you lost them) */
function showFormLinks() {
  const cfg  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.CFG);
  if (!cfg) { SpreadsheetApp.getUi().alert('Run setup() first.'); return; }
  const data = cfg.getDataRange().getValues();
  let msg = '';
  data.forEach(row => { if (row[0] && row[1]) msg += row[0] + ':\n' + row[1] + '\n\n'; });
  SpreadsheetApp.getUi().alert(msg);
}

/** Manually trigger absent-marking (useful for testing) */
function runMarkAbsent() {
  markAbsent();
  SpreadsheetApp.getUi().alert('Absent marking done.');
}
