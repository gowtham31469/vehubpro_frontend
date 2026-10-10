import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchBookings } from '../../utils/dealerBookings'
import { fetchReservations } from '../../utils/dealerReservations'
import { fetchSales } from '../../utils/dealerSales'
import BookingsSection from './BookingsSection'
import ReservationsSection from './ReservationsSection'
import SaleSection from './SaleSection'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export default function VehicleSalesPipelineTab({ vehicle, reloadVehicle }) {
  const { showToast } = useToast()
  const [reservations, setReservations] = useState([])
  const [bookings, setBookings] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, bRes, sRes] = await Promise.all([
        fetchReservations(vehicle.id),
        fetchBookings(vehicle.id),
        fetchSales(vehicle.id),
      ])
      setReservations(toArray(rRes))
      setBookings(toArray(bRes))
      setSales(toArray(sRes))
    } catch (err) {
      showToast('error', err.message || 'Failed to load sales pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [vehicle.id])

  const handleChanged = () => {
    load()
    reloadVehicle()
  }

  if (loading) return <p className="text-sm text-slate-400">Loading sales pipeline...</p>

  return (
    <div className="space-y-5">
      <ReservationsSection vehicle={vehicle} reservations={reservations} onChanged={handleChanged} showToast={showToast} />
      <BookingsSection vehicle={vehicle} bookings={bookings} reservations={reservations} onChanged={handleChanged} showToast={showToast} />
      <SaleSection vehicle={vehicle} sales={sales} bookings={bookings} onChanged={handleChanged} showToast={showToast} />
    </div>
  )
}
