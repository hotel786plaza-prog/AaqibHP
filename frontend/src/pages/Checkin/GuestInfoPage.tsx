import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  toIST,
  formatDateTime,
  addDaysWithTime,
  differenceInDaysWithTime,
} from "../../utils/dateUtils";
import { calculateGST } from "../../utils/billingUtils";
import { indianStates } from "../../components/indianStates";
import LoadingSpinner from "../../components/LoadingSpinner";

function getInitialCheckinState(field: string, defaultValue: any) {
  try {
    const raw = sessionStorage.getItem("checkin_guest_state");
    if (raw) {
      const data = JSON.parse(raw);
      if (data && field in data) return data[field];
    }
  } catch {}
  return defaultValue;
}


// Validation regexes
const nameRegex = /^[A-Za-z\s]+$/;
const phoneRegex = /^\d{10}$/;
const ageRegex = /^\d{1,2}$/;
const idValidation = (type: string, value: string) => {
  switch (type) {
    case "Aadhaar":
      return /^\d{12}$/.test(value);
    case "PAN":
	  return /^[A-Za-z0-9]{1,10}$/.test(value);
    case "Passport":
      return /^[A-Z]\d{7}$/.test(value);
    case "VoterID":
      return /^\d{10}$/.test(value);
    case "DL":
      return /^[A-Za-z0-9]{15}$/.test(value);
    default:
      return true;
  }
};

export default function GuestInfoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const room: Room | undefined = location.state?.room;

  const today = new Date();

  const [guests, setGuests] = useState<Guest[]>(() =>
    getInitialCheckinState("guests", [])
  );
  const [stayDays, setStayDays] = useState<number>(() =>
    getInitialCheckinState("stayDays", 1)
  );
  const [tillDate, setTillDate] = useState<string>(() =>
    getInitialCheckinState("tillDate", formatDateTime(addDaysWithTime(today, 1)))
  );
  const [emergencyContact, setEmergencyContact] = useState<{ name: string; number: string }>(() =>
    getInitialCheckinState("emergencyContact", { name: "", number: "" })
  );

  const handleDaysChange = (days: number) => {
    const normalized = Math.max(1, days || 1);
    setStayDays(normalized);
    const checkout = addDaysWithTime(today, normalized);
    setTillDate(formatDateTime(checkout));
  };

  const handleDateChange = (dateStr: string) => {
    setTillDate(dateStr);
    const d = new Date(dateStr);
    const calculatedDays = differenceInDaysWithTime(d);
    setStayDays(calculatedDays);
  };


  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);

  const editingGuest = guests.find((g) => g.id === editingGuestId) || null;
  const formIsPrimary =
    editingGuestId !== null ? !!editingGuest?.isPrimary : guests.length === 0;


const [emergencyContactError, setEmergencyContactError] = useState("");



  const emptyGuest: Guest = {
    id: 0,
    name: "",
    age: 0,
    phone: "",
    gender: "",
    isPrimary: formIsPrimary,
    idProofType: "",
    idProofNumber: "",
    address: "",
    city: "",
    state: "",
	emergency_contact_name: "",    // Added here
    emergency_contact_number: "",
  };

  const [formData, setFormData] = useState<Guest>(emptyGuest);

  // Validation error messages
  const [validationErrors, setValidationErrors] = useState({
    name: "",
    phone: "",
    age: "",
    idProofNumber: "",
  });

  const resetForm = (isPrimary: boolean) => {
    setFormData({ ...emptyGuest, isPrimary });
    setEditingGuestId(null);
    setValidationErrors({ name: "", phone: "", age: "", idProofNumber: "" });
  };

  const handleField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? Number(value) : value,
    }));


    if (name === "name") {
      setValidationErrors((prev) => ({
        ...prev,
        name: value.length > 0 && !nameRegex.test(value) ? "Only alphabets allowed" : "",
      }));
    } else if (name === "phone") {
      setValidationErrors((prev) => ({
        ...prev,
        phone: value.length > 0 && !phoneRegex.test(value) ? "Phone must be exactly 10 digits" : "",
      }));
    } else if (name === "age") {
      setValidationErrors((prev) => ({
        ...prev,
        age: value.length > 0 && !ageRegex.test(value.toString()) ? "Age must be 1 or 2 digits" : "",
      }));
    } else if (name === "idProofNumber") {
      const proofType = formData.idProofType || "";
      setValidationErrors((prev) => ({
        ...prev,
        idProofNumber:
          value.length > 0 && proofType && !idValidation(proofType, value)
            ? "Invalid format for " + proofType
            : "",
      }));
    } else if (name === "idProofType" && formData.idProofNumber) {
      // re-validate if the type is changed after number entry
      setValidationErrors((prev) => ({
        ...prev,
        idProofNumber:
          formData.idProofNumber.length > 0 && value && !idValidation(value, formData.idProofNumber)
            ? "Invalid format for " + value
            : "",
      }));
    }
  };
  
const idFieldProps = (() => {
  switch (formData.idProofType) {
    case "Aadhaar":
      return { maxLength: 12, pattern: "\\d{12}", inputMode: "numeric" };
    case "PAN":
      return { maxLength: 10, pattern: "[A-Za-z0-9]{1,10}", inputMode: "text" };
    case "Passport":
      return { maxLength: 8, pattern: "[A-Z]{1}\\d{7}", inputMode: "text" };
    case "VoterID":
      return { maxLength: 10, pattern: "\\d{10}", inputMode: "numeric" };
    case "DL":
      return { maxLength: 15, pattern: "[A-Za-z0-9]{15}", inputMode: "text" };
    default:
      return {};
  }
})();


  
  const validateForm = (): string | null => {
    if (!formData.name?.trim()) return "Name is required.";
    if (validationErrors.name) return validationErrors.name;
    if (!formData.phone?.trim()) return "Phone number is required.";
    if (validationErrors.phone) return validationErrors.phone;
    if (!formData.gender) return "Please select gender.";
    if (!formData.age || formData.age <= 0) return "Valid age is required.";
    if (validationErrors.age) return validationErrors.age;
const validateEmergencyContact = () => {
  let errors = { name: "", number: "" };
  if (!emergencyContact.name.trim()) errors.name = "Emergency contact name is required.";
  if (!emergencyContact.number.trim()) errors.number = "Emergency contact number is required.";
  else if (!/^\d{10}$/.test(emergencyContact.number)) errors.number = "Emergency contact number must be 10 digits.";
  

  setEmergencyContactErrors(errors);

  return !errors.name && !errors.number;
};

    if (formIsPrimary) {
      if (!formData.idProofType)
        return "ID proof type is required for primary guest.";
      if (!formData.idProofNumber?.trim())
        return "ID number is required for primary guest.";
      if (validationErrors.idProofNumber) return validationErrors.idProofNumber;
      if (!formData.address?.trim())
        return "Address is required for primary guest.";
      if (!formData.city?.trim()) return "City is required for primary guest.";
      if (!formData.state?.trim())
        return "State is required for primary guest.";
		 if (
      formIsPrimary &&
      (!formData.emergency_contact_name?.trim() ||
      !formData.emergency_contact_number?.trim())
    ) {
      return "Emergency contact name and number are required for primary guest.";
    }
    }
    return null;
  };

 const handleSave = () => {
    const err = validateForm();
    if (err) {
      alert(err);
      return;
    }
    setLoading(true);

    if (editingGuestId !== null) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === editingGuestId
            ? { ...g, ...formData, id: g.id }
            : g
        )
      );
      resetForm(false);
    } else {
      const newGuest = {
        ...formData,
        id: Date.now(),
        isPrimary: formIsPrimary,
      };
      setGuests((prev) => [...prev, newGuest]);
      resetForm(false);
    }

    setLoading(false);
  };


  const handleEdit = (guest: Guest) => {
    setEditingGuestId(guest.id);
    setFormData({
      ...guest,
      idProofType: guest.idProofType ?? "",
      idProofNumber: guest.idProofNumber ?? "",
      address: guest.address ?? "",
      city: guest.city ?? "",
      state: guest.state ?? "",
    });
    setEmergencyContact({
      name: guest.emergency_contact_name ?? "",
      number: guest.emergency_contact_number ?? "",
    });
    setValidationErrors({ name: "", phone: "", age: "", idProofNumber: "" });
  };

  const handleDelete = (id: number) => {
    setGuests((prev) => {
      const removed = prev.find((g) => g.id === id);
      const next = prev.filter((g) => g.id !== id);

      if (removed?.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
    if (editingGuestId === id) resetForm(guests.length <= 1);
  };

  const primaryGuestState =
    guests.find((g) => g.isPrimary)?.state?.trim() ?? "KARNATAKA";
  const gst = room
    ? calculateGST(primaryGuestState, room.base_price)
    : { cgst: 0, sgst: 0, igst: 0, gstPercent: 0, totalGST: 0, finalRoomCharge: 0 };

  const totalCost = room ? gst.finalRoomCharge : 0;

  const prepareGuestsForBilling = () => {
    if (!room) return [];
    return guests.map((g) => ({
      ...g,
      room_id: room.id,
      stayDays,
      tillDate,
      checkin_time: formatDateTime(toIST(new Date())),
    }));
  };
  
const [loading, setLoading] = useState(false);


  const handleContinueToBilling = async () => {
  sessionStorage.setItem("checkin_preserve", "true");
    setLoading(true);
    try {
      const checkinState = {
        room,
        guests: prepareGuestsForBilling(),
        stayDays,
        tillDate,
      };
      sessionStorage.setItem("checkin_guest_state", JSON.stringify(checkinState));
      navigate("/bill-me", { state: checkinState });
    } finally {
      setLoading(false);
    }
  };


useEffect(() => {
  return () => {
    // Only clear if preserveOnForward is NOT set
    if (!sessionStorage.getItem("checkin_preserve")) {
      sessionStorage.removeItem("checkin_guest_state");
    }
    sessionStorage.removeItem("checkin_preserve"); // Reset flag always
  };
}, []);


  return (
  
    <div className="w-full min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-r from-green-300 via-green-400 to-yellow-300 text-green-900 ">
      {/* Header */}
      <div className="rounded-2xl bg-yellow-500 text-white p-5 shadow-lg font-normal">
        <h1 className="text-xl sm:text-2xl font-normal">
          Check-in • Guest Details
        </h1>
        <p className="opacity-90 text-sm mt-1 font-normal">
          Capture stay info and guest details before billing.
        </p>
      </div>

      {/* Room Info */}
      {room && (
        <div className="bg-green-50 border border-yellow-300 rounded-xl p-4 shadow-md text-green-900 space-y-2 font-normal">
          <h2 className="text-lg font-normal">Room Details</h2>
          <p>🛏 Room No: {room.room_number}</p>
          <p>Type: {room.room_type}</p>
          <p>Floor: {room.floor}</p>
          <p>Base Cost: ₹{room.base_price} / Day</p>
          <p>
            GST {gst.gstPercent}%: ₹{gst.totalGST.toFixed(2)}{" "}
            {gst.cgst > 0 && `CGST ₹${gst.cgst.toFixed(2)}`}
            {gst.sgst > 0 && `, SGST ₹${gst.sgst.toFixed(2)}`}
            {gst.igst > 0 && `, IGST ₹${gst.igst.toFixed(2)}`}
          </p>
          <p>
            <span className="font-semibold text-yellow-900">
              Total: ₹{gst.finalRoomCharge.toFixed(2)} / Day
            </span>
          </p>
        </div>
      )}

	{/* Stay Duration */}
      <section className="bg-green-50 rounded-2xl shadow-sm border border-yellow-300 font-normal">
        <div className="px-5 py-4 border-b border-yellow-300 bg-yellow-100/70 rounded-t-2xl">
          <h2 className="text-yellow-900 font-normal">Stay Duration</h2>
        </div>
        <div className="p-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-yellow-900 font-normal">Days of Stay</label>
            <select
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
              value={stayDays}
              onChange={(e) => handleDaysChange(Number(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "Day" : "Days"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-yellow-900 font-normal">Till Date</label>
            <input
              type="datetime-local"
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
              value={tillDate}
              min={formatDateTime(today)}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
        </div>
      </section>

			 {/* Guest Form */}
		<section className="bg-green-50 rounded-2xl shadow-sm border border-yellow-300 font-normal">
		  <div className="px-5 py-4 border-b border-yellow-300 bg-yellow-100/70 rounded-t-2xl flex items-center justify-between">
			<h2 className="text-yellow-900 font-normal">
			  {editingGuestId
				? formIsPrimary ? "Edit Primary Guest" : "Edit Guest"
				: formIsPrimary ? "Primary Guest Details" : "Add Guest"}
			</h2>
		  </div>

		  <div className="p-5 grid gap-4">
			<div className="grid sm:grid-cols-2 gap-4">
			  {/* Name */}
			  <div className="space-y-1">
				<label className="text-sm text-yellow-900 font-normal">Name</label>
				<input
				  name="name"
				  value={formData.name}
				  onChange={handleField}
				  placeholder="Full name"
				  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
				/>
				{validationErrors.name && (
				  <p className="text-red-600 text-xs">{validationErrors.name}</p>
				)}
			  </div>
			  {/* Phone */}
			  <div className="space-y-1">
				<label className="text-sm text-yellow-900 font-normal">Phone Number</label>
				<input
				  name="phone"
				  type="tel"
				  value={formData.phone}
				  onChange={handleField}
				  placeholder="10-digit number"
				  maxLength={10}
				  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
				/>
				{validationErrors.phone && (
				  <p className="text-red-600 text-xs">{validationErrors.phone}</p>
				)}
			  </div>
			  {/* Age */}
			  <div className="space-y-1">
				<label className="text-sm text-yellow-900 font-normal">Age</label>
				<input
				  name="age"
				  type="number"
				  value={formData.age || ""}
				  onChange={e => {
					if (e.target.value.length > 2) return;
					handleField(e);
				  }}
				  placeholder="Age"
				  min={1}
				  max={99}
				  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
				/>
				{validationErrors.age && (
				  <p className="text-red-600 text-xs">{validationErrors.age}</p>
				)}
			  </div>
			  {/* Gender */}
			  <div className="space-y-1">
				<label className="text-sm text-yellow-900 font-normal">Gender</label>
				<div className="flex items-center gap-4 border rounded-xl px-3 py-2 font-normal">
				  {(["Male", "Female", "Other"] as const).map((g) => (
					<label key={g} className="flex items-center gap-2 text-sm font-normal">
					  <input
						type="radio"
						name="gender"
						value={g}
						checked={formData.gender === g}
						onChange={(e) =>
						  setFormData((prev) => ({
							...prev,
							gender: e.target.value as Guest["gender"],
						  }))
						}
					  />
					  {g}
					</label>
				  ))}
				</div>
			  </div>
			</div>

			{/* Primary-only fields */}
			{formIsPrimary && (
			  <>
				<div className="grid sm:grid-cols-2 gap-4">
				  <div className="space-y-1">
					<label className="text-sm text-yellow-900 font-normal">ID Proof Type</label>
					<select
					  name="idProofType"
					  value={formData.idProofType}
					  onChange={handleField}
					  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					>
					  <option value="">Select ID proof</option>
					  <option value="Aadhaar">Aadhaar Card</option>
					  <option value="PAN">PAN Card</option>
					  <option value="Passport">Passport</option>
					  <option value="DL">Driving License</option>
					  <option value="VoterID">Voter ID</option>
					  <option value="Other">Other</option>
					</select>
				  </div>
				  <div className="space-y-1">
					<label className="text-sm text-yellow-900 font-normal">ID Number</label>
					<input
					  name="idProofNumber"
					  value={formData.idProofNumber}
					  onChange={handleField}
					  placeholder="Enter ID number"
					  maxLength={idFieldProps.maxLength}
					  pattern={idFieldProps.pattern}
					  inputMode={idFieldProps.inputMode}
					  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					/>
					{validationErrors.idProofNumber && (
					  <p className="text-red-600 text-xs">{validationErrors.idProofNumber}</p>
					)}
				  </div>
				</div>
				<div className="space-y-1">
				  <label className="text-sm text-yellow-900 font-normal">Address</label>
				  <textarea
					name="address"
					value={formData.address}
					onChange={handleField}
					placeholder="House / Street / Area"
					className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					rows={2}
				  />
				</div>

				<div className="grid sm:grid-cols-2 gap-4">
				  <div className="space-y-1">
					<label className="text-sm text-yellow-900 font-normal">City</label>
					<input
					  name="city"
					  value={formData.city}
					  onChange={handleField}
					  placeholder="City"
					  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					/>
				  </div>
				<div className="space-y-1">
				  <label className="text-sm text-yellow-900 font-normal">State</label>
				  <input
					list="states"
					name="state"
					value={formData.state}
					onChange={handleField}   // your function to update formData based on name/value
					placeholder="Enter or select state"
					className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
				  />
				  <datalist id="states">
					{indianStates.map((state) => (
					  <option key={state} value={state} />
					))}
				  </datalist>
				</div>	
				</div>

				{/* Emergency Contact */}
				<section className="bg-green-50 rounded-2xl shadow-sm border border-yellow-300 font-normal mt-6">
				  <div className="px-5 py-4 border-b border-yellow-300 bg-yellow-100/70 rounded-t-2xl">
					<h2 className="text-yellow-900 font-normal">Emergency Contact</h2>
				  </div>
				  <div className="p-5 grid sm:grid-cols-2 gap-4">
					<div className="space-y-1 font-normal">
					  <label className="text-sm text-yellow-900">Contact Name</label>
					  <input
						placeholder="Contact person"
						value={formData.emergency_contact_name || ""}
						onChange={(e) =>
						  setFormData((prev) => ({ ...prev, emergency_contact_name: e.target.value }))
						}
						className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					  />
					</div>
					<div className="space-y-1 font-normal">
					  <label className="text-sm text-yellow-900">Contact Number</label>
					  <input
						placeholder="Phone number"
						value={formData.emergency_contact_number || ""}
						onChange={(e) =>
						  setFormData((prev) => ({ ...prev, emergency_contact_number: e.target.value }))
						}
						className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400 font-normal"
					  />
					</div>
				  </div>
				</section>
			  </>
			)}

			{/* Actions */}
			<div className="flex flex-wrap gap-3 pt-2 font-normal">
			  <button
				onClick={handleSave}
				className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-xl shadow"
			  >
				{editingGuestId !== null ? "Update Guest" : "Save Guest"}
			  </button>
			  {editingGuestId !== null && (
				<button
				  onClick={() => resetForm(guests.length === 0)}
				  className="border border-yellow-300 text-yellow-800 hover:bg-yellow-50 px-5 py-2 rounded-xl"
				>
				  Cancel
				</button>
			  )}
			</div>
		  </div>
		</section>

		  
	      {/* Saved Guests */}
      <section className="bg-green-50 rounded-2xl shadow-sm border border-yellow-300 font-normal">
        <div className="px-5 py-4 border-b border-yellow-300 bg-yellow-100/70 rounded-t-2xl">
          <h2 className="text-yellow-900 font-normal">Saved Guests</h2>
        </div>
        <div className="p-5 grid gap-4 text-green-900">
          {guests.length === 0 ? (
            <p className="text-sm text-yellow-900/80 font-normal">No guests added yet.</p>
          ) : (
            guests.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-yellow-300 bg-yellow-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-normal"
              >
                <div className="text-sm font-normal">
                  <p className="font-normal">
                    {g.isPrimary ? "Primary Guest" : "Guest"}
                  </p>
                  <p>
                    {g.name} • {g.gender} • Age {g.age} • {g.phone}
                  </p>
                  {g.isPrimary && (
                    <div className="mt-1 text-yellow-900/90">
                      <p>
                        ID: {g.idProofType || "-"}{" "}
                        {g.idProofNumber ? `• ${g.idProofNumber}` : ""}
                      </p>
                      <p>
                        {g.address || "-"}
                        {g.city ? `, ${g.city}` : ""}
                        {g.state ? `, ${g.state}` : ""}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 font-normal">
                  <button
                    onClick={() => handleEdit(g)}
                    className="border border-yellow-300 text-yellow-800 hover:bg-yellow-50 px-3 py-1.5 rounded-lg text-sm font-normal"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-normal"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      
     {/* Footer Actions */}
		<div className="flex justify-between font-normal">
		  {loading ? (
			<LoadingSpinner />
		  ) : (
		  <>
		  <button
		  className="border px-4 py-2 rounded-lg font-normal text-base"
			  onClick={() => {
				sessionStorage.removeItem("checkin_guest_state");
				navigate(-1); // or navigate("/room-select")
			  }}
			>
			  Back
			</button>

			<button
			  className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-xl shadow disabled:opacity-60 font-normal"
			  disabled={guests.length === 0}
			  onClick={handleContinueToBilling}
			>
			  Continue to Billing
			</button>
		  </>)}
		</div>
    </div>
  );
}
