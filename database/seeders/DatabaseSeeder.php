<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User
        User::firstOrCreate(
            ['email' => 'admin@court.com'],
            [
                'name' => 'Court Administrator',
                'password' => Hash::make('admin1234'),
                'role' => 'admin',
            ]
        );

        // Create standard test user
        User::firstOrCreate(
            ['email' => 'user@court.com'],
            [
                'name' => 'Regular Player',
                'password' => Hash::make('password123'),
                'role' => 'user',
            ]
        );
    }
}
