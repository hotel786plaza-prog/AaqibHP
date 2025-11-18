export function calculateGST(
  guestState: string,
  roomBaseCharge: number
): {
  cgst: number,
  sgst: number,
  igst: number,
  gstPercent: number,
  totalGST: number,
  finalRoomCharge: number
} {
  if (roomBaseCharge <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      gstPercent: 0,
      totalGST: 0,
      finalRoomCharge: 0,
    };
  }

  const isKarnataka = guestState.trim().toUpperCase() === "KARNATAKA";
  let cgst = 0, sgst = 0, igst = 0, gstPercent = 0;

  if (isKarnataka) {
      cgst = roomBaseCharge * 0.025;
      sgst = roomBaseCharge * 0.025;
      gstPercent = 5;
    
  } else {
    igst = roomBaseCharge * 0.05;
    gstPercent = 5;
  }

  const totalGST = cgst + sgst + igst;
  const finalRoomCharge = roomBaseCharge + totalGST;

  return { cgst, sgst, igst, gstPercent, totalGST, finalRoomCharge };
}
