<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReservationController extends Controller
{
    /**
     * Get reservations belonging to the authenticated user.
     */
    public function index(Request $request)
    {
        return Reservation::where('user_id', $request->user()->id)
            ->orderBy('reservation_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->get();
    }

    /**
     * Get public/shared court schedule so any user can see which dates and times are booked.
     */
    public function schedule(Request $request)
    {
        $query = Reservation::query()
            ->where('status', '!=', 'cancelled')
            ->orderBy('reservation_date', 'asc')
            ->orderBy('start_time', 'asc');

        if ($request->filled('date')) {
            $query->where('reservation_date', $request->date);
        } else {
            // By default, show schedule from today onwards for the next 30 days
            $today = Carbon::today()->toDateString();
            $maxDate = Carbon::today()->addDays(30)->toDateString();
            $query->whereBetween('reservation_date', [$today, $maxDate]);
        }

        $userId = ($request->user('sanctum') ?? $request->user())?->id;

        $reservations = $query->get()->map(function ($res) use ($userId) {
            return [
                'id' => $res->id,
                'activity_type' => $res->activity_type,
                'reservation_date' => $res->reservation_date,
                'start_time' => $res->start_time,
                'end_time' => $res->end_time,
                'status' => $res->status,
                'notes' => $res->notes,
                'is_mine' => $userId && $res->user_id === $userId,
            ];
        });

        return response()->json($reservations);
    }

    /**
     * Create a new reservation with exact overlap checking.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'activity_type' => ['required', Rule::in(['pickleball', 'basketball', 'volleyball', 'other'])],
            'reservation_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'notes' => 'nullable|string|max:500',
        ]);

        // Check for conflicting reservations that are not cancelled
        $overlap = Reservation::where('reservation_date', $validated['reservation_date'])
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($validated) {
                $query->where('start_time', '<', $validated['end_time'])
                    ->where('end_time', '>', $validated['start_time']);
            })
            ->first();

        if ($overlap) {
            $startTime = substr($overlap->start_time, 0, 5);
            $endTime = substr($overlap->end_time, 0, 5);
            $activity = ucfirst($overlap->activity_type);

            return response()->json([
                'message' => "This court is already reserved on {$validated['reservation_date']} from {$startTime} to {$endTime} ({$activity}). Please choose another time.",
                'conflict' => [
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'activity_type' => $overlap->activity_type,
                ],
            ], 422);
        }

        $validated['status'] = 'confirmed'; // Automatically confirmed or pending
        $reservation = $request->user()->reservations()->create($validated);

        return response()->json($reservation, 201);
    }

    /**
     * Cancel/delete a reservation by the owning user.
     */
    public function destroy(Request $request, Reservation $reservation)
    {
        if ($reservation->user_id !== $request->user()->id && ! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized to cancel this reservation.'], 403);
        }

        $reservation->delete();

        return response()->json(['message' => 'Reservation cancelled successfully.']);
    }
}
