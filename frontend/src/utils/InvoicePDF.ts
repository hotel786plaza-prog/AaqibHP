import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./times-new-roman-normal"; 
import "./times-new-roman-bold"; 
import "./Noto_Sans-normal"; 
import logo from "../Images/logo.png"; // small PNG/JPG
import { toIST } from "./dateUtils";

interface InvoiceProps {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  checkin: string;
  checkout: string;
  days: number;
  roomRate: number;
  advancePaid: number;
  discount: number;
  extraCharges?: number;
  balanceDue: number; // still in props, but won’t display in final bill
  logo?: string;
  cgst?: number;
sgst?: number;
igst?: number;
}

export const generateInvoicePDF = (props: InvoiceProps) => {
  const doc = new jsPDF("p", "mm", "a4");

  // 🔹 reusable function to draw one invoice
  const drawInvoice = (offsetY: number, copyLabel: string) => {
    const {
      hotelName,
      hotelAddress,
      hotelPhone,
      guestName,
      guestPhone,
      roomNumber,
      roomType,
      floor,
      checkin,
      checkout,
      days,
      roomRate,
      advancePaid,
      discount,
	  extraCharges = 0,
	   cgst = 0,
    sgst = 0,
    igst = 0,
    } = props;
	
	doc.setFont("TimesNewRoman", "normal"); 
    const baseAmount = roomRate * days + extraCharges;
	const totalAmountIncludingGST = baseAmount + cgst + sgst + igst;
	
// --- Header with Logo ---
if (props.logo || logo) {
  const logoData = props.logo || logo; // use prop if given, else default
  const logoWidth = 25;  // adjust size as needed
  const logoHeight = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = (pageWidth - logoWidth) / 2;

  // place at top (shift hotel name down accordingly)
  doc.addImage(logoData, "PNG", centerX, offsetY - 10, logoWidth, logoHeight);

  offsetY += 5; // give a little spacing below logo
}


    // --- Header ---
    doc.setFontSize(16);
	doc.setFont("TimesNewRoman", "bold");
    doc.text(`${hotelName}`, 105, offsetY + 2, { align: "center" });

    doc.setFontSize(9);
    doc.text(hotelAddress, 105, offsetY + 7, { align: "center" });
    doc.text(`Phone: ${hotelPhone}`, 105, offsetY + 11, { align: "center" });
	
	doc.setFontSize(9);
    doc.text('GSTIN: 29AARFH2699P1Z4', 105, offsetY + 16, { align: "center" });


    doc.setLineWidth(0.5);
    doc.line(18, offsetY + 18, 190, offsetY + 18);

    // --- Customer Info ---
    // doc.setFontSize(12);
    // doc.text("Customer Information", 18, offsetY + 38);
    doc.setFontSize(11);
		doc.setFont("TimesNewRoman", "normal");
   const marginLeft = 20;
	const gap = 20; // space between name and phone

	doc.setFontSize(11);

	// Text we actually print
	const nameText = `Name: ${guestName}`;
	doc.text(nameText, marginLeft, offsetY + 24);

	// Measure exact width of printed text
	const nameWidth = doc.getTextWidth(nameText);

	// Add phone after name + gap
	doc.text(`Phone: ${guestPhone}`, marginLeft + nameWidth + gap, offsetY + 24);


    // --- Room Info ---
    // doc.setFontSize(13);
    // doc.text("Room Information", 18, offsetY + 52);
    doc.setFontSize(11);
    doc.text(`Room: ${roomNumber}`, 20, offsetY + 29);
	doc.text(`Floor: ${floor}`, 60, offsetY + 29);
    doc.text(`Type: ${roomType}`, 100, offsetY + 29);
    

    // --- Stay Duration ---

	doc.setFont("TimesNewRoman", "normal");
	doc.setFontSize(9);
	const checkinWithSpace = checkin.replace(" ", "     "); // 3 spaces
	const checkoutWithSpace = checkout.replace(" ", "     ");
	
	autoTable(doc, {
	  startY: offsetY + 32,
	  head: [["Check-in", "Check-out", "Days Stayed"]],
	  body: [[checkinWithSpace, checkoutWithSpace, days.toString()]],
	  theme: "grid",
	  headStyles: { fillColor: [41, 128, 185] }, // blue header
	  styles: { halign: "center", valign: "middle"},
	  margin: { left: 20, right: 20 },
	  
	});

    // --- Billing Table ---
	const gstEnabled = days > 0 && (cgst > 0 || sgst > 0 || igst > 0);

	const allCharges = [
  ["Room Charges", roomRate.toString(), days.toString(), (roomRate * days).toFixed(2)],
  ...(cgst > 0 ? [["CGST", "", "", cgst.toFixed(2)]] : []),
  ...(sgst > 0 ? [["SGST", "", "", sgst.toFixed(2)]] : []),
  ...(igst > 0 ? [["IGST", "", "", igst.toFixed(2)]] : []),
  ...(extraCharges > 0 ? [["Extra Charges", "", "", extraCharges.toFixed(2)]] : []),
 
  [
    { content: "Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
    totalAmountIncludingGST.toFixed(2)
  ],
  ["Advance Paid", "", "", (advancePaid).toFixed(2)],
  ["Discount", "", "", (discount).toFixed(2)],
  [
    { content: "Final Amount to be paid", colSpan: 3, styles: { halign: "right", fontStyle: "bold" , fontsize:"5"} },
    (totalAmountIncludingGST - advancePaid - discount).toFixed(2)
  ],
];


	autoTable(doc, {
	  startY: offsetY + 50,
	  head: [["Description", "Rate per day (Rs.)", "Days", "Amount (Rs.)"]],
	  body: allCharges,
	  theme: "grid",
	  headStyles: { fillColor: [41, 128, 185] },
	  margin: { left: 20, right: 20 },
	});

	
	
	// don't
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("All the taxes are included", 105, offsetY + 123, { align: "center" });

  
    // --- Footer ---
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Thank You for staying with us!", 105, offsetY + 128, { align: "center" });
  };

  // 🔹 Top copy (Customer)
  drawInvoice(10);

  // 🔹 Cut line
  doc.setDrawColor(150);
  doc.setLineDash([3, 3], 0);
  doc.line(2, 146, 210, 146);
  doc.setFontSize(8);
  doc.setTextColor(120);
  // doc.text("Cut Here", 105, 153, { align: "center" });
  
  //reset
  doc.setLineDash([]); 
  doc.setTextColor(0);

  // 🔹 Bottom copy (Hotel)
  drawInvoice(155);

  // Save file
  const todayIST = toIST(new Date());
  const yyyy = todayIST.getFullYear();
  const mm = (todayIST.getMonth() + 1).toString().padStart(2, "0");
  const dd = todayIST.getDate().toString().padStart(2, "0");
  const dateStr = `${dd}-${mm}-${yyyy}`;

  doc.save(`${props.guestName}_${dateStr}.pdf`);
};
