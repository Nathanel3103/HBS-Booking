import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useRouter } from "next/router";

export default function Payment() {
    const router = useRouter();
    const [booking, setBooking] = useState(null);

    useEffect(() => {
        const stored = sessionStorage.getItem("pendingBooking");
        if (stored) {
            setBooking(JSON.parse(stored));
        } else {
            router.replace("/"); // fallback
        }
    }, []);

    const confirmBooking = async () => {
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking),
            });

            if (res.ok) {
                alert(" payment successful! Booking confirmed.");
                sessionStorage.removeItem("pendingBooking");
                router.push("/patient-dashboard");
            } else {
                alert("Booking failed after payment.");
            }
        } catch (err) {
            console.error("Payment booking error:", err);
            alert("Unexpected error occurred.");
        }
    };

    if (!booking) return <p className="p-8">Loading payment details...</p>;

    return (
        <PayPalScriptProvider options={{ "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
            <div className="min-h-screen bg-gray-50 py-12 px-6 flex justify-center items-center">
                <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-lg">
                    <h2 className="text-2xl font-semibold mb-6 text-center">Confirm Appointment Payment</h2>
                    <p className="mb-4 text-gray-700">
                        You're booking a <strong>{booking.appointmentType}</strong> on <strong>{booking.date}</strong> at{" "}
                        <strong>{booking.time}</strong>.
                    </p>
                    <p className="mb-4 text-lg font-semibold">
                        Booking Fee: <span className="text-blue-600">$3.00</span>
                    </p>

                    <PayPalButtons
                        style={{ layout: "vertical" }}
                        createOrder={(data, actions) => {
                            return actions.order.create({
                                purchase_units: [{ amount: { value: "3.00" } }],
                            });
                        }}
                        onApprove={async (data, actions) => {
                            await actions.order.capture();
                            await confirmBooking();
                        }}
                    />
                </div>
            </div>
        </PayPalScriptProvider>
    );
}
