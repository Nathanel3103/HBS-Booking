import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

function App({ Component, pageProps }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const user = localStorage.getItem("user");

    /**  const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated && router.pathname !== "/login" && router.pathname !== "/register") {
      router.push("/login"); // Redirect users who are not logged in
    }
  }, [router]);

  return <Component {...pageProps} />; */

  if (!user && router.pathname !== "/login" && router.pathname !== "/register") {
    console.log("No user found, redirecting to login...");
    router.push("/login");
  } else {
    console.log("User found, allowing access:", JSON.parse(user));
  }

  setIsLoading(false); // Ensure page renders after check
}, [router]);

if (isLoading) {
  return <p>Loading...</p>; // Prevents flickering when checking auth
}

return <Component {...pageProps} />;
  
}

export default App;