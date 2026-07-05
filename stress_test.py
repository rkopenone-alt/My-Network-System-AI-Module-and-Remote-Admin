import asyncio
import aiohttp
import time
import random
import string

BASE_URL = "http://localhost:3001/api"

async def create_user(session, i):
    payload = {
        "name": f"Stress Tester {i}",
        "phone": f"666000{i:04d}",
        "serialNumber": f"SN-NEW-{i:04d}",
        "role": "rescuer"
    }
    async with session.post(f"{BASE_URL}/users", json=payload) as response:
        return await response.json(), response.status

async def create_rescue_request(session, i):
    payload = {
        "citizenName": f"Citizen {i}",
        "phone": f"444000{i:04d}",
        "latitude": 34.0522 + random.uniform(-0.01, 0.01),
        "longitude": -118.2437 + random.uniform(-0.01, 0.01),
        "medical_info": "Stress test emergency",
        "timestamp": int(time.time() * 1000)
    }
    async with session.post(f"{BASE_URL}/rescue-requests", json=payload) as response:
        return await response.json(), response.status

async def main():
    print("Starting Stress Test...")
    start_time = time.time()
    num_requests = 100

    async with aiohttp.ClientSession() as session:
        # Launch user creations concurrently
        user_tasks = [create_user(session, i) for i in range(num_requests)]
        print(f"Executing {num_requests} concurrent user creations...")
        user_results = await asyncio.gather(*user_tasks)
        
        user_success = sum(1 for r, status in user_results if status in (200, 201) or (status == 400 and 'duplicate' in str(r).lower()))
        user_fails = num_requests - user_success

        # Launch rescue requests concurrently
        rescue_tasks = [create_rescue_request(session, i) for i in range(num_requests)]
        print(f"Executing {num_requests} concurrent rescue requests...")
        rescue_results = await asyncio.gather(*rescue_tasks)
        
        rescue_success = sum(1 for r, status in rescue_results if status in (200, 201))
        rescue_fails = num_requests - rescue_success

    duration = time.time() - start_time
    print("\n--- Stress Test Results ---")
    print(f"Total Time: {duration:.2f} seconds")
    print(f"User Creations: {user_success} succeeded, {user_fails} failed")
    print(f"Rescue Requests: {rescue_success} succeeded, {rescue_fails} failed")
    
    if user_fails == 0 and rescue_fails == 0:
        print("SUCCESS: No errors detected under load.")
    else:
        print("FAILURE: Errors detected under load.")
        print(f"Sample user fail: {[r for r in user_results if r[1] not in (200, 201) and not (r[1] == 400 and 'duplicate' in str(r[0]).lower())][:1]}")
        print(f"Sample rescue fail: {[r for r in rescue_results if r[1] not in (200, 201)][:1]}")

if __name__ == "__main__":
    asyncio.run(main())
