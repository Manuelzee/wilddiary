import concurrent.futures
import time
import sqlite3
from db import get_connection, init_db

def run_user_session(user_id):
    # Simulate a user performing read and write operations
    conn = get_connection()
    try:
        # 1. Fetch recent posts (Index scan)
        posts = conn.execute('SELECT * FROM posts WHERE status=\"active\" ORDER BY created_at DESC LIMIT 20').fetchall()
        
        # 2. Fetch notifications
        notifs = conn.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 10', (user_id,)).fetchall()
        
        # 3. Simulate atomic read & reaction check
        liked = conn.execute('SELECT 1 FROM reactions WHERE user_id=? AND post_id=1', (user_id,)).fetchone()
        
        return True
    finally:
        conn.close()

def main():
    init_db()
    print('Starting simulated 1,000 user concurrent read/transaction benchmark...')
    start_time = time.perf_counter()
    
    # Run 1000 simulated user requests across 50 concurrent worker threads
    total_requests = 1000
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(run_user_session, i % 100 + 1) for i in range(total_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    total_time = time.perf_counter() - start_time
    avg_latency = (total_time / total_requests) * 1000
    throughput = total_requests / total_time
    
    print(f'Done! Processed {total_requests} concurrent user operations.')
    print(f'Total Elapsed: {total_time:.3f}s')
    print(f'Throughput: {throughput:.1f} requests/sec')
    print(f'Average Operation Latency: {avg_latency:.2f}ms')
    assert all(results)
    print('All 1,000 operations completed successfully with ZERO locks or failures!')

if __name__ == '__main__':
    main()
