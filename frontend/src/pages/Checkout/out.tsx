import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { Search } from "lucide-react";
import { formatDateTimeDisplay } from "../../utils/dateUtils";

export default function CheckoutRoomsPage() {
  const [occupiedRooms, setOccupiedRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchOccupiedRooms();
  }, []);

  const fetchOccupiedRooms = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id, checkin_time, checkout_time, stay_days, room_charge, discount, advance_payment, gross_total,
        rooms (id, room_number, room_type, floor, status),
        guests (id, name, age, phone, gender, is_primary)
      `
      )
      .eq("rooms.status", "Occupied");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setOccupiedRooms(data || []);
    setFilteredRooms(data || []);
    setLoading(false);
  };

  const handleSearch = () => {
    if (!searchTerm) {
      setFilteredRooms(occupiedRooms);
      return;
    }

    const results = occupiedRooms.filter(
      (booking) =>
        booking.rooms &&
        booking.rooms.room_number
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    setFilteredRooms(results);
  };

  const handleNavigateCheckout = async (booking: any) => {
    try {
      const checkinTimeIST = formatDateTimeDisplay(new Date());

      // log action in system_logs
      await supabase.from("system_logs").insert([
        {
          action: "CHECKOUT_INITIATED",
          details: `Checkout started for Booking ID ${booking.id}, Room ${booking.rooms?.room_number}`,
          created_at: checkinTimeIST,
        },
      ]);
      navigate(`/checkout/confirm-bill/${booking.id}`);
    } catch (err) {
      console.error("Error logging checkout start:", err);
    }
  };

  return (
    <div className=" p-6 font-normal text-green-900 bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 min-h-screen rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-normal">Step 1 of 3: Find Booking</h2>
        <button
          onClick={() => navigate("/")}
          className="text-yellow-600 hover:underline font-normal text-lg"
        >
          ← Back to Home
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-green-50 shadow rounded-2xl p-6 mb-6">
        <h3 className="text-2xl font-normal mb-2 text-center">
          Enter Room Number
        </h3>
        <p className="text-green-800 text-center mb-4 font-normal">
          Please enter the room number to find the booking details
        </p>

        <div className="flex justify-center gap-2 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g., 101, 201, 301"
            className="w-64 px-4 py-2 border rounded-lg focus:ring focus:ring-green-400 font-normal"
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-normal"
          >
            <Search size={18} /> Search
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-base text-green-800 font-normal">
          <p className="font-semibold mb-1">Instructions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Enter the room number (e.g., 101, 201)</li>
            <li>Only rooms with active bookings will be found</li>
            <li>Make sure the guest has completed their stay</li>
            <li>You'll see booking details before finalizing checkout</li>
          </ul>
        </div>
      </div>

      {/* Room Results */}
      {loading ? (
        <p className="text-green-800 font-normal">Loading occupied rooms...</p>
      ) : filteredRooms.length === 0 ? (
        <p className="text-green-800 font-normal text-center">
          No occupied rooms found for your search.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((booking) => {
            const guests = booking.guests || [];
            const primaryGuest = guests.find((g: any) => g.is_primary);
            const totalMembers = guests.length;

            return (
              <div
                key={booking.id}
                className="border rounded-2xl p-4 shadow bg-green-50 hover:shadow-lg transition font-normal"
              >
                <p className="font-semibold text-xl">
                  Room {booking.rooms?.room_number || "N/A"} (
                  {booking.rooms?.room_type || "Unknown"})
                </p>
                <p className="text-base text-green-800">
                  👤 {primaryGuest?.name || "N/A"} (Primary Guest)
                </p>
                <p className="text-base text-green-800">
                  👤 Total Members: {totalMembers}
                </p>
                <p className="text-base text-green-800">
				  ⏰ Check-in:{" "}
				  {booking.checkin_time ? formatDateTimeDisplay(new Date(booking.checkin_time)) : "N/A"}
				</p>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleNavigateCheckout(booking)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-base font-normal"
                  >
                     Continue to Checkout
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
