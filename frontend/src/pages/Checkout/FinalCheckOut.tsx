import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatDateTimeSQL , formatDateTimeDisplay } from "../../utils/dateUtils";
import { generateInvoicePDF } from "../../utils/InvoicePDF";
import { calculateGST } from "../../utils/billingUtils";
import { useLocation } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

export default function FinalCheckOut() {
  const { id } = useParams(); // booking_id
  const navigate = useNavigate();
  const [guest, setGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Cash" | "">("");
  const location = useLocation();
  const extraCharges = (location.state && location.state.extraCharges) ? location.state.extraCharges : 0;
const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) {
        setError("No booking id provided.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*, guests(*), rooms(*)")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setGuest(data);
      }
      setLoading(false);
    };

    fetchBooking();
  }, [id]);

  if (loading) return <p className="p-4">Loading billing details...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!guest) return <p className="p-4 text-red-500">No booking found.</p>;

  // --- Calculations ---
  const checkinDate = new Date(guest.checkin_time);
  const plannedDays = guest.stay_days;
  const checkoutDate = new Date(); // final checkout is now

//Delay
const msInHour = 1000 * 60 * 60;
const msInDay = msInHour * 24;
const diffMs = checkoutDate.getTime() - checkinDate.getTime();
const fullDays = Math.floor(diffMs / msInDay);
const leftoverMs = diffMs % msInDay;
const leftoverHours = leftoverMs / msInHour;
const gracePeriodHours = 0;
	const actualDays = leftoverHours <= gracePeriodHours ? fullDays : fullDays + 1;

 const roomRate = guest.rooms?.base_price || 0;
 
  const actualTotal = actualDays * roomRate;
  const advancePaid = guest.advance_payment || 0;
  const discount = guest.discount || 0;
const balanceDue = Math.max(actualTotal + extraCharges - advancePaid - discount, 0);


  const primaryGuest =
    guest.guests?.find((g: any) => g.is_primary) || guest.guests?.[0];

const gst = calculateGST(
  primaryGuest?.state ? primaryGuest.state.trim() : "KARNATAKA",
  roomRate
);

const gstTotalForStay = (gst.cgst + gst.sgst + gst.igst) * actualDays;
const totalBeforeAdjustments = actualTotal + gstTotalForStay + extraCharges;
const grossTotal = totalBeforeAdjustments - discount;

  // --- Confirm Checkout ---
const handleConfirmCheckout = async () => {
  if (!guest) return;

 if (paymentMethod === "") {
    alert("Please select a payment method before completing the checkout.");
    return;
  }
  
    setIsProcessingCheckout(true); 
 
  try {
    // Insert all guests into guest_history
   const historyData = guest.guests.map((g: any) => ({
  booking_id: guest.id,
  room_id: guest.room_id,
  name: g.name,
  age: g.age,
  phone: g.phone,
  gender: g.gender,
  is_primary: g.is_primary,
  id_proof_type: g.id_proof_type,
  id_proof_number: g.id_proof_number,
  address: g.address,
  city: g.city,
  state: g.state,
  checkin_time: guest.checkin_time,
  checkout_time: checkoutDate.toISOString(),
  gross_total: g.is_primary ? grossTotal : 0,
  discount: g.is_primary ? discount : 0,
  advance_payment: g.is_primary ? advancePaid : 0,
  extra_charges: g.is_primary ? extraCharges : 0,
  total_amount: g.is_primary ? grossTotal : 0,
}));



    const { error: insertError } = await supabase
      .from("guest_history")
      .insert(historyData);

    if (insertError) throw insertError;

    // Mark room as available
    await supabase
      .from("rooms")
      .update({ status: "Available" })
      .eq("id", guest.room_id);

    // Delete guest + booking
    await supabase.from("guests").delete().eq("booking_id", guest.id);
    await supabase.from("bookings").delete().eq("id", guest.id);

	// ✅ Current time in IST (SQL format)
    const checkinTimeIST = formatDateTimeSQL(new Date());

    await supabase.from("system_logs").insert([
      {
        action: "CHECKOUT_COMPLETED",
        details: `Guest(s) checked out from booking ${guest.id}, room ${guest.rooms?.room_number}`,
		created_at: checkinTimeIST,
      },
    ]);

      toast.success("Checkout Completed!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});

    navigate("/");
  } catch (err: any) {
   // ❌ failure log
  await supabase.from("system_logs").insert([
    {
      action: "CHECKOUT_FAILED",
      details: `Failed to checkout booking ${guest?.id}. Error: ${err.message}`,
    },
  ]);

          toast.error("Checkout Failed!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});
		
  }finally {
    setIsProcessingCheckout(false);
  }
};

 // --- PDF Download ---
const handleDownloadPDF = async () => {


  generateInvoicePDF({
    hotelName: "Hotel Plaza",
    hotelAddress: "#7, 6th Main Road, Next Gubbi Veeranna Ranga Mandira, Gandhinagar, Bangalore - 560009",
    hotelPhone: "080-22263101 , 080-22263102 , 080-22263103",   
    guestName: primaryGuest?.name || "Guest",
    guestPhone: primaryGuest?.phone || "-",
    roomNumber: guest.rooms?.room_number,
    roomType: guest.rooms?.room_type,
    floor: guest.rooms?.floor,
    checkin: formatDateTimeDisplay(new Date(guest.checkin_time)),
	checkout: formatDateTimeDisplay(new Date()),
    days: actualDays,
    roomRate,
    advancePaid,
    discount,
	extraCharges,
    balanceDue,
	cgst: Number(gst.cgst || 0) * Number(actualDays || 1),
	sgst: Number(gst.sgst || 0) * Number(actualDays || 1),
	igst: Number(gst.igst || 0) * Number(actualDays || 1),
  });

  await supabase.from("system_logs").insert([
    {
      action: "DOWNLOAD_PDF",
      details: `Final bill PDF (jsPDF) downloaded for booking ${guest.id} (FinalBill_${primaryGuest?.name}_${dateStr}.pdf)`,    },
  ]);
};

const totalBeforeDiscount = actualDays * (roomRate + gst.cgst + gst.sgst + gst.igst) + extraCharges;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 font-normal text-green-900 bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 min-h-screen rounded-xl">
      {/* Bill Content */}
      <div
        ref={billRef}
        className="bg-green-50 shadow-lg rounded-xl p-8 border lg:col-span-2"
      >
        {/* Header */}
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-3xl font-normal text-green-900">Hotel Plaza</h1>
          <p className="text-base text-green-700">
            Gandhinagar Bengaluru - 560 009 <br /> Phone No. 080-41241657
          </p>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-normal mb-2 text-green-900">
              Customer Information
            </h2>
            <p>
              <strong>Name:</strong> {primaryGuest?.name}
            </p>
            <p>
              <strong>Phone:</strong> {primaryGuest?.phone}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-normal mb-2 text-green-900">
              Room Information
            </h2>
            <p>
              <strong>Room:</strong> {guest.rooms?.room_number}
            </p>
            <p>
              <strong>Type:</strong> {guest.rooms?.room_type}
            </p>
            <p>
              <strong>Floor:</strong> {guest.rooms?.floor}
            </p>
          </div>
        </div>

        {/* Stay Duration */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p>
              <strong>Check-in:</strong> {formatDateTimeDisplay(checkinDate)}
            </p>
          </div>
          <div>
            <p>
              <strong>Check-out:</strong> {formatDateTimeDisplay(checkoutDate)}
            </p>
          </div>
          <div>
            <p>
              <strong>Actual Days:</strong> {actualDays}
            </p>
          </div>
        </div>

        {/* Billing Summary */}
		<div className="space-y-2">
		  <div className="flex justify-between">
			<span>
			  Room Charges ({actualDays} × ₹{roomRate})
			</span>
			<span>₹{actualTotal.toFixed(2)}</span>
		  </div>

		  <div className="flex justify-between text-purple-700">
			<span>CGST</span>
			<span>₹{(gst.cgst * actualDays).toFixed(2)}</span>
		  </div>

		  <div className="flex justify-between text-purple-700">
			<span>SGST</span>
			<span>₹{(gst.sgst * actualDays).toFixed(2)}</span>
		  </div>

		  <div className="flex justify-between text-purple-700">
			<span>IGST</span>
			<span>₹{(gst.igst * actualDays).toFixed(2)}</span>
		  </div>

		  {extraCharges > 0 && (
			<div className="flex justify-between text-red-700">
			  <span>Extra Charges</span>
			  <span>₹{extraCharges.toFixed(2)}</span>
			</div>
		  )}
		  
		  <hr />
		  <p className="flex justify-between font-bold text-lg text-red-600">
			  <span>Total Charges</span>
			  <span>₹{totalBeforeDiscount.toFixed(2)}</span>
			</p>
			<hr />

		  <div className="flex justify-between text-green-700">
			<span>Advance Paid</span>
			<span>- ₹{advancePaid.toFixed(2)}</span>
		  </div>

		  <div className="flex justify-between text-blue-700">
			<span>Discount</span>
			<span>- ₹{discount.toFixed(2)}</span>
		  </div>

		  <hr />

		  <div className="flex justify-between font-bold text-lg text-red-600">
			<span>Total Balance Due</span>
			<span>
			  ₹{(actualTotal + (gst.cgst + gst.sgst + gst.igst) * actualDays + extraCharges - advancePaid - discount).toFixed(2)}
			</span>
		  </div>
		</div>


        {/* Footer */}
        <div className="text-center text-base text-green-700">
          <p>Thank you for staying with us!</p>
          <p>
            Generated on: {checkoutDate.toLocaleDateString()}{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Actions Sidebar */}
      <div className="space-y-4">
	  {/* Payment Method */}
		<div className="bg-white shadow-lg rounded-xl p-6 border mb-4">
		  <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
		  <div className="flex flex-col gap-2">
			<label className="flex items-center gap-2">
			  <input
				type="radio"
				name="paymentMethod"
				value="UPI"
				checked={paymentMethod === "UPI"}
				onChange={() => setPaymentMethod("UPI")}
				className="form-radio"
			  />
			  UPI
			</label>
			<label className="flex items-center gap-2">
			  <input
				type="radio"
				name="paymentMethod"
				value="Cash"
				checked={paymentMethod === "Cash"}
				onChange={() => setPaymentMethod("Cash")}
				className="form-radio"
			  />
			  Cash
			</label>
		  </div>
		</div>
		
		{isProcessingCheckout ? (
			  <LoadingSpinner />
			) : (
			  <div className="bg-green-50 shadow-lg rounded-xl p-6 border font-normal">
				<h2 className="text-lg font-normal mb-4 text-green-900">Bill Actions</h2>
				<button
				  onClick={handleDownloadPDF}
				  className="w-full px-4 py-2 mb-2 bg-yellow-200 rounded-lg hover:bg-yellow-300 font-normal"
				  disabled={isProcessingCheckout}
				>
				  ⬇ Download PDF
				</button>

			   <button
			  onClick={handleConfirmCheckout}
			  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-normal flex justify-center items-center gap-2"
			  disabled={isProcessingCheckout}
			>
			  {isProcessingCheckout && <LoadingSpinner />}
			  {isProcessingCheckout ? "Processing..." : "✅ Complete Check-out"}
			</button>
			  </div>
			)}

      </div>
    </div>
  );
}

