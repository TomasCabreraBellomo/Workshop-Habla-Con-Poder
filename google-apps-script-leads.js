function doPost(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Leads");

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Leads");
    }

    const data = JSON.parse(e.postData.contents);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Fecha",
        "Nombre",
        "Apellido",
        "Email",
        "Telefono",
        "Empresa",
        "Cargo",
        "Sector",
        "Metodo de pago",
        "Mensaje",
        "Origen",
        "Acepto terminos"
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.name || "",
      data.lastName || "",
      data.email || "",
      data.phone || "",
      data.company || "",
      data.role || "",
      data.sector || "",
      data.paymentMethod || "",
      data.message || "",
      data.source || "website",
      data.acceptedTerms === true ? "Si" : "No"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
