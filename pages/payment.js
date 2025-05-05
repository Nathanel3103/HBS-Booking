import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PaymentPage() {
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        cardNumber: "",
        expiry: "",
        cvc: "",
        address: "",
        city: "",
        state: "",
        zip: "",
    });
    const router = useRouter();

    useEffect(() => {
        const data = sessionStorage.getItem("pendingBooking");
        if (data) {
            setBookingData(JSON.parse(data));
        } else {
            router.push("/");
        }
    }, [router]);

    const handleMockPayment = async () => {
        if (!bookingData) return;

        /*if (
            form.cardNumber.length < 16 ||
            form.cvc.length < 3 ||
            !form.expiry ||
            !form.address ||
            !form.city ||
            !form.state ||
            !form.zip
        ) {
            alert("Please fill out all fields correctly.");
            return;
        }*/

        setLoading(true);
        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            if (response.ok) {
                sessionStorage.removeItem("pendingBooking");
                alert("Payment successful and appointment booked!");
                router.push("/patient-dashboard");
            } else if (response.status === 409) {
                alert("Slot already taken. Please rebook.");
                router.push("/general-checkup");
            } else {
                alert("Booking failed. Try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (!bookingData) return <div className="p-6">Loading...</div>;

    return (
        <div className="min-h-screen overflow-y-auto flex items-center justify-center bg-gray-100 px-4 py-10 sm:px-6 lg:px-8">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Secure Payment</h2>
                <p className="text-base sm:text-lg text-center text-gray-600 mb-6">
                    Booking Price: <span className="font-semibold">$30</span>
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Card Number</label>
                        <input
                            type="text"
                            name="cardNumber"
                            maxLength={16}
                            pattern="\d*"
                            value={form.cardNumber}
                            onChange={handleChange}
                            className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="1234 5678 9012 3456"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                            <input
                                type="text"
                                name="expiry"
                                value={form.expiry}
                                onChange={handleChange}
                                placeholder="MM/YY"
                                className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="flex-1 mt-4 sm:mt-0">
                            <label className="block text-sm font-medium text-gray-700">CVC</label>
                            <input
                                type="text"
                                name="cvc"
                                maxLength={4}
                                pattern="\d*"
                                value={form.cvc}
                                onChange={handleChange}
                                placeholder="123"
                                className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <hr className="my-4" />

                    <h3 className="text-lg font-semibold text-gray-800">Billing Address</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Street Address</label>
                        <input
                            type="text"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="flex-1 mt-4 sm:mt-0">
                            <label className="block text-sm font-medium text-gray-700">State</label>
                            <input
                                type="text"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="flex-1 mt-4 sm:mt-0">
                            <label className="block text-sm font-medium text-gray-700">Zip</label>
                            <input
                                type="text"
                                name="zip"
                                maxLength={10}
                                value={form.zip}
                                onChange={handleChange}
                                className="mt-1 w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleMockPayment}
                    disabled={loading}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md text-lg font-semibold transition-colors duration-200"
                >
                    {loading ? "Processing Payment..." : "Pay $30 and Confirm Booking"}
                </button>
            </div>
        </div>
    );
}
