document.addEventListener("DOMContentLoaded", function () {
  const sectionSelect = document.getElementById("sectionSelect");
  const section1Form = document.getElementById("section1Form");
  const section2Form = document.getElementById("section2Form");

  // Show form for the selected section
  sectionSelect.addEventListener("change", function () {
    const selectedSection = sectionSelect.value;
    section1Form.style.display = selectedSection === "1" ? "block" : "none";
    section2Form.style.display = selectedSection === "2" ? "block" : "none";
  });

  // Trigger initial display
  sectionSelect.dispatchEvent(new Event("change"));

  const sharedSubjectTeacherPairs = [];

  // Setup forms for both sections
  setupSection("1", sharedSubjectTeacherPairs);
  setupSection("2", sharedSubjectTeacherPairs);
});

function setupSection(section, sharedSubjectTeacherPairs) {
  const timetableForm = document.getElementById(`timetableForm${section}`);
  const subjectCountInput = document.getElementById(`subjectCount${section}`);
  const subjectTeacherInputs = document.getElementById(`subjectTeacherInputs${section}`);
  const timetableBody = document.querySelector(`#timetable${section} tbody`);
  const timetableHeader = document.getElementById(`timetable-header${section}`);
  const timetableTable = document.getElementById(`timetable${section}`);

  subjectCountInput.addEventListener("input", function () {
    const subjectCount = parseInt(subjectCountInput.value);
    subjectTeacherInputs.innerHTML = "";

    for (let i = 0; i < subjectCount; i++) {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>Subject ${i + 1}:</label>
        <input type="text" name="subject${section}${i}" placeholder="Enter Subject" required>
        <br /><label>Teacher ${i + 1}:</label>
        <input type="text" name="teacher${section}${i}" placeholder="Enter Teacher" required>
        <br />
      `;
      subjectTeacherInputs.appendChild(div);
    }
  });

  // Trigger initial input generation
  subjectCountInput.dispatchEvent(new Event("input"));

  timetableForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const timeSlots = parseInt(document.getElementById(`timeSlots${section}`).value);

    // Collect subject-teacher pairs
    for (let i = 0; i < subjectCountInput.value; i++) {
      const subject = document.querySelector(`[name="subject${section}${i}"]`).value;
      const teacher = document.querySelector(`[name="teacher${section}${i}"]`).value;

      if (!sharedSubjectTeacherPairs.some(pair => pair.subject === subject && pair.teacher === teacher)) {
        sharedSubjectTeacherPairs.push({ subject, teacher });
      }
    }

    // Generate the timetable
    generateTimetable(section, timeSlots, sharedSubjectTeacherPairs, timetableBody, timetableHeader, timetableTable);
  });

  document.getElementById(`downloadPDF${section}`).addEventListener("click", function () {
    downloadTimetableAsPDF(section);
  });
}

function generateTimetable(section, timeSlots, sharedSubjectTeacherPairs, timetableBody, timetableHeader, timetableTable) {
  timetableBody.innerHTML = ""; // Clear previous rows
  timetableHeader.innerHTML = ""; // Clear previous header
  timetableTable.style.display = "table"; // Ensure the timetable is visible

  const dayOfTheWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const lunchString = "LUNCH";
  const assignedPairsByDay = {};

  // Generate the table header (times)
  for (let i = 0; i <= timeSlots + 1; i++) {
    const tableHeader = document.createElement("th");
    if (i === 0) {
      tableHeader.textContent = ""; // Empty header for the first column
    } else {
      const startTime = new Date(0, 0, 0, 8, 50 + (i - 1) * 50); // Start at 8:50 AM
      const endTime = new Date(startTime.getTime() + 50 * 60 * 1000); // 50-minute duration
      const formatTime = (date) =>
        `${date.getHours() % 12 || 12}:${date.getMinutes().toString().padStart(2, "0")} ${
          date.getHours() >= 12 ? "PM" : "AM"
        }`;
      tableHeader.textContent = formatTime(startTime) + " - " + formatTime(endTime);
    }
    timetableHeader.appendChild(tableHeader);
  }

  // Generate rows for each day
  dayOfTheWeek.forEach((day) => {
    const row = document.createElement("tr");

    // Add day name in the first column
    const timeCell = document.createElement("td");
    timeCell.textContent = day;
    row.appendChild(timeCell);

    let lunchBreakAdded = false;
    assignedPairsByDay[day] = new Set(); // Track assigned pairs for the day

    // Fill time slots for the day
    for (let j = 0; j < timeSlots; j++) {
      const cell = document.createElement("td");

      // Add lunch break after 3rd slot
      if (j === 3 && !lunchBreakAdded) {
        cell.textContent = lunchString;
        cell.style.backgroundColor = "#f0ad4e";
        cell.style.color = "white";
        cell.style.textAlign = "center";
        lunchBreakAdded = true;
        row.appendChild(cell);
        j--; // Reassign this slot after lunch
      } else {
        const availablePairs = sharedSubjectTeacherPairs.filter(
          (pair) => !assignedPairsByDay[day].has(`${pair.subject}-${pair.teacher}`)
        );

        if (availablePairs.length > 0) {
          // Randomly assign a pair
          const randomPair =
            availablePairs[Math.floor(Math.random() * availablePairs.length)];
          cell.textContent = `${randomPair.subject} (${randomPair.teacher})`;

          // Mark the pair as assigned for this day
          assignedPairsByDay[day].add(`${randomPair.subject}-${randomPair.teacher}`);
        } else {
          // Assign a free period if no pairs are available
          cell.textContent = "Free Period";
        }
        row.appendChild(cell);
      }
    }
    timetableBody.appendChild(row);
  });
}

function downloadTimetableAsPDF(section) {
  const { jsPDF } = window.jspdf;

  const timetable = document.getElementById(`timetable${section}`);

  if (!timetable) {
    alert("Timetable not found");
    return;
  }

  // Use html2canvas to capture the timetable as an image
  html2canvas(timetable).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    // Add a heading mentioning the section
    const heading = `Timetable for Section ${section}`;
    pdf.setFontSize(18); // Set font size for the heading
    pdf.text(heading, 105, 20, { align: "center" }); // Center the heading

    // Calculate image dimensions to fit A4 page (with adjusted margins)
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // Margin of 10 on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add the timetable image below the heading
    pdf.addImage(imgData, "PNG", 10, 30, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(`Timetable_Section${section}.pdf`);
  }).catch((error) => {
    console.error("Error generating PDF:", error);
  });
}
