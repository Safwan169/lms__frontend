import { redirect } from "next/navigation"

export default async function AdminStudentProfileRedirect({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  redirect(`/dashboard/students/${id}`)
}
