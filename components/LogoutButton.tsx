"use client"

import { goToCentralLogout } from "@/lib/centralAuth"

export default function LogoutButton() {
  return (
    <button onClick={() => goToCentralLogout(window.location.origin)}>
      Logout
    </button>
  )
}
