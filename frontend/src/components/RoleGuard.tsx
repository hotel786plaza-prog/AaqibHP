import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

interface RoleGuardProps {
  children: JSX.Element
  allowedRoles: string[]
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error("Error fetching user:", userError)
          setLoading(false)
          return
        }

        const user = userData?.user
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (error) {
          console.error("Error fetching profile:", error)
        } else {
          console.log("Fetched role:", profile?.role)
          setRole(profile?.role || null)
        }
      } catch (err) {
        console.error("Unexpected error in RoleGuard:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  if (loading) return <p>Loading role...</p>

  if (!role) return <Navigate to="/login" replace />

  // ✅ Owner can ONLY access /admin
  if (role === "owner" && location.pathname !== "/admin") {
    return <Navigate to="/admin" replace />
  }

  // ✅ Billing desk can ONLY access dashboard/check-in flow
  if (role === "billing_desk" && location.pathname === "/admin") {
    return <Navigate to="/" replace />
  }

  if (allowedRoles.includes(role)) {
    return children
  }

  // ✅ Unauthorized → 403 page or fallback
  return <p>Access Denied</p>
}
