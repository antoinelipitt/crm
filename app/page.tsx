import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">CRM Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Manage your customer relationships efficiently
        </p>
        <Link href="/login">
          <Button size="lg">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  )
}
