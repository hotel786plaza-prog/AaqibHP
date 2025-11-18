import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ViewGuestsPage() {
  const [guestsByFloor, setGuestsByFloor] = useState<Record<string, any[]>>({});
const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    setLoading(true);

    // Get bookings + guests + rooms
const { data, error } = await supabase
  .from("bookings")
  .select(
    `
    id, checkin_time, checkout_time, stay_days, room_charge, discount, advance_payment, gross_total,
    rooms (id, room_number, room_type, floor),
    guests (
      id, name, age, phone, gender, is_primary,
      id_proof_type, id_proof_number, address, city, state,
      emergency_contact_name, emergency_contact_number
    )
    `
  )
  .order("floor", { referencedTable: "rooms" });

	  
	  

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Group bookings by floor
    const grouped: Record<string, any[]> = {};
    data.forEach((booking: any) => {
      const floor = booking.rooms?.floor || "Unknown";
      if (!grouped[floor]) grouped[floor] = [];
      grouped[floor].push(booking);
    });

    setGuestsByFloor(grouped);
    setLoading(false);
  };

const toggleExpand = (bookingId: string) => {
  setExpandedBookingId(prev => prev === bookingId ? null : bookingId);
};


  return (
    <div className="p-6 font-normal text-green-900 bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 min-h-screen rounded-xl">
      <h2 className="text-3xl font-normal mb-6">👥 Current Guests</h2>

      {loading ? (
        <p className="font-normal text-green-800">Loading guests...</p>
      ) : (
        Object.keys(guestsByFloor).map((floor) => (
          <div key={floor} className="mb-8">
            <h3 className="text-2xl font-normal mb-4">🏢 Floor {floor}</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {guestsByFloor[floor].map((booking: any) => {
                const primaryGuest = booking.guests.find((g: any) => g.is_primary);
                const totalMembers = booking.guests.length;

                return (
                  <div
                    key={booking.id}
                    className="border rounded-2xl p-4 shadow bg-green-50 font-normal"
                  >
                    {/* Room Summary */}
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleExpand(booking.id)}
                    >
                      <p className="font-semibold text-xl text-green-900">
                        Room {booking.rooms.room_number} ({booking.rooms.room_type})
                      </p>
                      <p className="text-base text-green-800">
                        👤 {primaryGuest?.name || "N/A"} (Primary Guest)
                      </p>
                      <p className="text-base text-green-800">
                        Total Members: {totalMembers}
                      </p>
                    </div>

                   <div
					  className={`transition-all duration-300 ease-in-out overflow-hidden text-base text-green-700 border-t ${
						expandedBookingId === booking.id
						  ? "max-h-[1000px] opacity-100 py-3 mt-3"
						  : "max-h-0 opacity-0 py-0 mt-0"
					  }`}
					>
					  <div aria-hidden={expandedBookingId !== booking.id}>
						<p>🗓 Stay: {booking.stay_days} days</p>
						<p>⏰ Check-in: {new Date(booking.checkin_time).toLocaleString()}</p>
						<p>⏰ Check-out: {new Date(booking.checkout_time).toLocaleString()}</p>
						<p>💰 Total Charge: ₹{booking.gross_total}</p>
						<p>💸 Discount: ₹{booking.discount}</p>
						<p>💵 Advance Paid: ₹{booking.advance_payment}</p>
						<p className="font-semibold text-green-900">
						  Gross Total: ₹{booking.gross_total}
						</p>
						<hr className="my-2 border-yellow-300" />
						<h4 className="font-semibold text-green-900">Guests:</h4>
						{booking.guests.map((g: any) => (
						  <p key={g.id}>
							{g.is_primary ? "⭐" : "👥"} {g.name} ({g.gender}, {g.age}y) - {g.phone}
						  </p>
						))}
						{/* Edit Button */}
						<div className="mt-3 flex justify-end">
						  <button
							onClick={() =>
							  navigate(`/edit-booking/${booking.id}`, {
								state: { booking },
							  })
							}
							className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-base font-normal"
						  >
							✏️ Edit Booking
						  </button>
						</div>
					  </div>
					</div>					
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
