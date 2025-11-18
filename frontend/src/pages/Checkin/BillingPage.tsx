import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { formatDateTimeSQL } from "../../utils/dateUtils";
import { calculateGST } from "../../utils/billingUtils";  // Import GST calc
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";


export default function BillingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { room, guests, stayDays, tillDate } = location.state;

  // Find primary guest's state to calculate GST accordingly
  const primaryGuest = guests.find((g: any) => g.isPrimary);
  const guestState = primaryGuest?.state?.trim() || "KARNATAKA";

  // Calculate GST on base price per day
  const gst = calculateGST(guestState, room.base_price);

  // Total GST amount per day (CGST+SGST+IGST)
  const gstAmountPerDay = gst.cgst + gst.sgst + gst.igst;

  // Base charge (room price per day + GST) × stay days
  const baseCharge = (room.base_price) * stayDays;

  // Initial states as empty string
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState(""); // empty string
  const [advance, setAdvance] = useState("");   // empty string
  const [loading, setLoading] = useState(false);


  // Parse input fields or default to 0 for calculation
const gstTotal = gstAmountPerDay * stayDays;
const discountValue = discountEnabled ? Number(discount) || 0 : 0;
const grossTotal = baseCharge + gstTotal - discountValue;


  // Confirm Check-In
  const handleConfirm = async () => {
   setLoading(true);
    try {
      const checkinTimeIST = formatDateTimeSQL(new Date());
      const tillIST = formatDateTimeSQL(new Date(tillDate));

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([
          {
            room_id: room.id,
            checkin_time: checkinTimeIST,
            checkout_time: tillIST,
            stay_days: stayDays,
            room_charge: baseCharge,
            discount: discountEnabled ? Number(discount) || 0 : 0, // parse
            advance_payment: Number(advance) || 0, // parse
            gross_total: grossTotal,
          },
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

		const guestsWithBooking = guests.map((g: any) => ({
		  booking_id: booking.id,
		  room_id: room.id,
		  name: g.name,
		  age: g.age,
		  phone: g.phone,
		  gender: g.gender,
		  is_primary: g.isPrimary,
		  id_proof_type: g.idProofType,
		  id_proof_number: g.idProofNumber,
		  address: g.address,
		  city: g.city,
		  state: g.state,
		  emergency_contact_name: g.emergency_contact_name || null,
		  emergency_contact_number: g.emergency_contact_number || null,
		}));


      const { error: guestsError } = await supabase.from("guests").insert(guestsWithBooking);
      if (guestsError) throw guestsError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "Occupied" })
        .eq("id", room.id);
      if (roomError) throw roomError;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("system_logs").insert([
        {
          action: "Check-In Completed",
          details: `User ${user?.email || "Unknown"} checked in Room ${room.room_number} (${room.room_type}) with ${guests.length} guest(s). Stay: ${stayDays} day(s).`,
          created_at: formatDateTimeSQL(new Date()),
        },
      ]);

      toast.success("Check-in completed!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});

	  sessionStorage.removeItem("checkin_guest_state");
      navigate("/");
    } catch (err: any) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("system_logs").insert([
        {
          action: "CHECKIN_FAILED",
          details: `User ${user?.email || "Unknown"} failed to check in Room ${room?.room_number || "Unknown"}. Error: ${err.message}`,
          created_at: formatDateTimeSQL(new Date()),
        },
      ]);
	  
            toast.error("Check-in Failed!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});
		
    } finally {
    setLoading(false);
  }
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-normal text-green-900 bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 min-h-screen rounded-xl text-9xl">

      {/* Booking Summary */}
      <div className="border rounded-xl p-5 shadow bg-green-50">
        <h2 className="text-xl font-normal mb-3">Booking Summary</h2>
        <p className="text-base">Room No: {room.room_number}</p>
        <p className="text-base">Type: {room.room_type}</p>
        <p className="text-base">Floor: {room.floor}</p>
        <p className="text-base">Rate per night: ₹{room.base_price}</p>
        <p className="text-base">GST per day: ₹{gstAmountPerDay.toFixed(2)}</p>
        <hr className="my-3 border-yellow-300" />
        <h3 className="font-normal text-lg">Guests</h3>
        {guests.map((g: any) => (
          <div key={g.id} className="text-base mb-2">
            <strong>{g.isPrimary ? "Primary Guest" : "Guest"}:</strong> {g.name} (
            {g.gender}, {g.age}y) - {g.phone}
          </div>
        ))}
        <hr className="my-3 border-yellow-300" />
        <h3 className="font-normal text-lg">Stay Duration</h3>
        <p className="text-base">Check-in: {new Date().toLocaleString()}</p>
        <p className="text-base">Check-out: {new Date(tillDate).toLocaleString()}</p>
        <p className="text-base">Total Days: {stayDays}</p>
      </div>

      {/* Bill Details */}
      <div className="border rounded-xl p-5 shadow bg-green-50">
        <h2 className="text-xl font-normal mb-3">Bill Details</h2>
        <p className="text-base">
          Room charge ({stayDays} days × ₹{room.base_price}): ₹{baseCharge.toFixed(2)}
        </p>
        <p className="text-base">GST ({stayDays} days × ₹{gstAmountPerDay.toFixed(2)}): ₹{(gstAmountPerDay*stayDays).toFixed(2)}</p>

        {/* Discount Toggle */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
            />
            <span className="font-normal text-base">Apply Discount</span>
            {discountEnabled && (
              <input
                type="number"
                className="border px-3 py-2 rounded font-normal text-base"
                style={{ width: "140px" }}
                placeholder="Amount"
                value={discount}
                onChange={(e) =>
                  setDiscount(e.target.value === "" ? "" : e.target.value.replace(/^0+/, "") || "")
                }
                min={0}
              />
            )}
          </div>
        </div>

        {/* Advance Payment */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="font-normal text-base">Advance Payment</span>
            <input
              type="number"
              className="border px-3 py-2 rounded font-normal text-base"
              style={{ width: "140px" }}
              placeholder="Amount"
              value={advance}
              onChange={(e) =>
                setAdvance(e.target.value === "" ? "" : e.target.value.replace(/^0+/, "") || "")
              }
              min={0}
            />
          </div>
        </div>

        {/* Gross Total */}
        <hr className="my-3 border-yellow-300" />
        <h3 className="font-normal text-lg">
          Gross Total: ₹{grossTotal >= 0 ? grossTotal.toFixed(2) : 0}
        </h3>

        {/* Actions */}
        {loading ? (
		  <LoadingSpinner />
		) : (
		  <div className="flex justify-between mt-5">
			<button
			  className="border px-4 py-2 rounded-lg font-normal text-base"
			  onClick={() => navigate(-1)}
			>
			  Go Back
			</button>
			<button
			  className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-lg shadow font-normal text-base"
			  onClick={handleConfirm}
			>
			  Confirm Check-In
			</button>
		  </div>
		)}
      </div>
    </div>
  );
}
