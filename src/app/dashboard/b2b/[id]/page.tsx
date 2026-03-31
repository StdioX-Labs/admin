"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { ArrowLeft, Building2 } from "lucide-react"

export default function B2BDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const id = params?.id as string | undefined;

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    )
  }

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Invalid B2B ID</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/b2b")}
            className="hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to B2B
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-6 h-6 mr-2" />
              B2B Details - ID: {id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is under construction. B2B ID: {id}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

