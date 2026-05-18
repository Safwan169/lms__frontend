import { redirect } from "next/navigation"

export default function AdminTeacherProfileRedirect({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/dashboard/teachers/${params.id}`)
}
