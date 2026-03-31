export async function saveLaunchCurriculum(payload: {
  lessons: Array<{
    id: string
    title: string
    steps: Array<{ title: string; instruction: string }>
  }>
}) {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return (await response.json()) as {
    ok: boolean
    issues: Array<{
      code: string
      lessonId: string
      value: string
    }>
  }
}
