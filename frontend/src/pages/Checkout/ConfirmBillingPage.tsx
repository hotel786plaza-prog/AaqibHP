import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { formatDateTimeDisplay } from "../../utils/dateUtils";
import { calculateGST } from "../../utils/billingUtils";

export default function ConfirmBillPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
const [extraCharges, setExtraCharges] = useState(0);

  useEffect(() => {
    if (bookingId) fetchBooking(bookingId);
  }, [bookingId]);

  const fetchBooking = async (bookingId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`id, checkin_time, checkout_time, stay_days, room_charge, discount, advance_payment, gross_total,
               rooms (id, room_number, room_type, floor, base_price),
               guests (id, name, age, phone, gender, is_primary, id_proof_type, id_proof_number, address, city, state)`)
      .eq("id", bookingId)
      .single();

    if (error) {
      console.error("Error fetching booking:", error);
      setLoading(false);
      return;
    }
    setBooking(data);
    setLoading(false);
  };

  if (loading) return <p className="p-6 text-green-900">Loading booking details...</p>;
  if (!booking) return <p className="p-6 text-red-600">Booking not found</p>;

  // --- Timing and Days Calculation (SAME as Step 3) ---
  const checkinDate = new Date(booking.checkin_time);
  const checkoutDate = new Date(); // now

  const msInHour = 1000 * 60 * 60;
  const msInDay = msInHour * 24;

  const diffMs = checkoutDate.getTime() - checkinDate.getTime();
  const fullDays = Math.floor(diffMs / msInDay);
  const leftoverMs = diffMs % msInDay;
  const leftoverHours = leftoverMs / msInHour;

  const gracePeriodHours = 0;
  const actualDays = leftoverHours <= gracePeriodHours ? fullDays : fullDays + 1;

  // --- Financials ---
  const safeRoomRate = Number(booking.rooms?.base_price) || 0;
  const safeAdvancePaid = Number(booking.advance_payment) || 0;
  const safeDiscount = Number(booking.discount) || 0;
  const safeExtraCharges = Number(extraCharges) || 0;

  const primaryGuest = booking.guests.find((g: any) => g.is_primary) || booking.guests[0];
  const gst = calculateGST(primaryGuest?.state?.trim() || "KARNATAKA", safeRoomRate);

  const balanceDue = Math.max(
    actualDays * (safeRoomRate + gst.cgst + gst.sgst + gst.igst) +
      safeExtraCharges -
      safeAdvancePaid -
      safeDiscount,
    0
  );

  const totalPersons = booking.guests.length;
  const maxAllowed =
    booking.rooms?.room_type === "Ordinary" || booking.rooms?.room_type === "Single"
      ? 1
      : booking.rooms?.room_type === "Double"
      ? 2
      : booking.rooms?.room_type === "Triple"
      ? 3
      : 1;

  const showExtraWarning = totalPersons > maxAllowed;
  const totalBeforeDiscount = actualDays * (safeRoomRate + gst.cgst + gst.sgst + gst.igst) + safeExtraCharges;


  return (
    <div className="p-6 font-normal text-green-900 bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 min-h-screen rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="text-yellow-600 hover:underline text-lg">
          ← Back
        </button>
        <h2 className="text-2xl font-normal">Step 2: Review</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-green-50 shadow rounded-2xl p-6">
          <h3 className="text-xl mb-4">🏨 Room & Guest Details</h3>
          <p>Room: {booking.rooms?.room_number}</p>
          <p>Type: {booking.rooms?.room_type}</p>
          <p>Floor: {booking.rooms?.floor}</p>
          {/*<p>Rate: ₹{safeRoomRate}/night</p>*/}
          <hr className="my-4 border-yellow-300" />
          <h4 className="mt-4 mb-2">Guest Info</h4>
          <p>Name: {primaryGuest?.name}</p>
          <p>Persons: {totalPersons}</p>
          <p>Phone: {primaryGuest?.phone}</p>
          <p>
            ID Proof: {primaryGuest?.id_proof_type} - {primaryGuest?.id_proof_number}
          </p>
          <p>
            Address: {primaryGuest?.address}, {primaryGuest?.city}, {primaryGuest?.state}
          </p>
        </section>

        <section className="bg-green-50 shadow rounded-2xl p-6">
          <h3 className="text-xl mb-4">🧾 Billing Summary</h3>
          <p>Check-in: {formatDateTimeDisplay(checkinDate)}</p>
          <p>Actual Checkout: {formatDateTimeDisplay(checkoutDate)}</p>
          <p>Planned Days: {booking.stay_days}</p>
          <p>Actual Days: {actualDays}</p>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-1 text-base">
            <p>
              Room Charges ({actualDays} × ₹{safeRoomRate}): ₹{(actualDays * safeRoomRate).toFixed(2)}
            </p>
            <p className="text-purple-700">CGST : ₹{(gst.cgst * actualDays).toFixed(2)}</p>
            <p className="text-purple-700">SGST : ₹{(gst.sgst * actualDays).toFixed(2)}</p>
            <p className="text-purple-700">IGST : ₹{(gst.igst * actualDays).toFixed(2)}</p>
            {safeExtraCharges > 0 && <p className="text-red-700">Extra Charges: ₹{safeExtraCharges.toFixed(2)}</p>}
			<hr />
			<p className="font-bold text-red-600">  Total Charges : ₹{totalBeforeDiscount.toFixed(2)}</p>
			<hr />
            <p className="text-green-700">Advance Paid: ₹{safeAdvancePaid.toFixed(2)}</p>
            <p className="text-blue-700">Discount: ₹{safeDiscount.toFixed(2)}</p>
            <hr />
            <p className="font-bold text-red-600">Balance Due: ₹{balanceDue.toFixed(2)}</p>
          </div>

          {showExtraWarning && (
            <div className="mt-3 bg-red-100 border-l-4 border-red-600 p-3 rounded text-sm text-red-700">
              ⚠ Extra persons detected (allowed: {maxAllowed}, staying: {totalPersons}).
            </div>
          )}

          <div className="mt-4">
            <label className="block mb-1">Enter Extra Charges (if any)</label>
<input
  type="number"
  inputMode="numeric"
  className="border p-2 rounded w-full"
  value={extraCharges === 0 ? "" : extraCharges}
  onChange={e => {
    const val = e.target.value.replace(/^0+(?=\d)/, "");
    setExtraCharges(val === "" ? 0 : parseFloat(val));
  }}
/>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button className="rounded border px-4 py-2 hover:bg-gray-100" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
              onClick={() => navigate(`/checkout/finalize/${booking.id}`, { state: { extraCharges } })}
            >
              Generate Final Bill →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
