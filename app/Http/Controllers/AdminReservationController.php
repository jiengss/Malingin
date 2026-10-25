<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminReservationController extends Controller
{
    /**
     * Display a listing of all reservations with user details and filtering.
     */
    public function index(Request $request)
    {
        $query = Reservation::with('user:id,name,email')
            ->orderBy('reservation_date', 'desc')
            ->orderBy('start_time', 'asc');

        if ($request->filled('date')) {
            $query->where('reservation_date', $request->date);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }

        return response()->json($query->get());
    }

    /**
     * Update the status of a specific reservation (pending, confirmed, cancelled).
     */
    public function updateStatus(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'confirmed', 'cancelled'])],
        ]);

        $reservation->update(['status' => $validated['status']]);

        return response()->json([
            'message' => "Reservation status updated to {$validated['status']}.",
            'reservation' => $reservation->load('user:id,name,email'),
        ]);
    }

    /**
     * Delete a reservation as administrator.
     */
    public function destroy(Reservation $reservation)
    {
        $reservation->delete();

        return response()->json([
            'message' => 'Reservation removed successfully by administrator.',
        ]);
    }

    /**
     * Get summary metrics for the admin dashboard.
     */
    public function stats()
    {
        $today = Carbon::today()->toDateString();

        return response()->json([
            'total_reservations' => Reservation::count(),
            'pending_reservations' => Reservation::where('status', 'pending')->count(),
            'confirmed_reservations' => Reservation::where('status', 'confirmed')->count(),
            'cancelled_reservations' => Reservation::where('status', 'cancelled')->count(),
            'today_reservations' => Reservation::where('reservation_date', $today)
                ->where('status', '!=', 'cancelled')
                ->count(),
            'total_users' => User::where('role', '!=', 'admin')->count(),
        ]);
    }
}
