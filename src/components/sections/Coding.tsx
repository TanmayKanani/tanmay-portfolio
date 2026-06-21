import { getCpData } from '@/lib/cp'
import CodingView from './CodingView'

// Server component: fetches live CP stats (cached 1h) and hands them
// to the animated client view. Falls back gracefully inside getCpData.
export default async function Coding() {
  const data = await getCpData()
  return <CodingView data={data} />
}
