import pickle
import numpy as np
from tqdm import tqdm
import multiprocessing as mp
from collections import Counter

def check_move_validity(prev_move, current_move, board):
    if prev_move is None:
        return True, "Valid move (first move)"
    prev_row, prev_col = divmod(prev_move, 9)
    current_row, current_col = divmod(current_move, 9)
    prev_sub_board = (prev_row % 3) * 3 + (prev_col % 3)
    current_sub_board = (current_row // 3) * 3 + (current_col // 3)
    
    if board[current_row, current_col] != 0:
        return False, "Cell already occupied"
    
    if prev_sub_board != current_sub_board:
        target_sub_board = board[3*(prev_row%3):3*(prev_row%3)+3, 3*(prev_col%3):3*(prev_col%3)+3]
        if np.all(target_sub_board != 0) or check_sub_board_win(target_sub_board):
            return True, "Valid move (target sub-board full or won)"
        return False, "Invalid sub-board"
    return True, "Valid move"

def check_sub_board_win(sub_board):
    for i in range(3):
        if np.all(sub_board[i, :] == sub_board[i, 0]) and sub_board[i, 0] != 0:
            return True
        if np.all(sub_board[:, i] == sub_board[0, i]) and sub_board[0, i] != 0:
            return True
    if np.all(np.diag(sub_board) == sub_board[0, 0]) and sub_board[0, 0] != 0:
        return True
    if np.all(np.diag(np.fliplr(sub_board)) == sub_board[0, 2]) and sub_board[0, 2] != 0:
        return True
    return False

def analyze_game(game_data):
    valid_moves = 0
    invalid_moves = 0
    invalid_move_reasons = []
    
    prev_move = None
    
    for move_data in game_data:
        if len(move_data) != 3:
            continue
        
        player, state, move = move_data
        if move is None:
            continue  # Skip game start indicator
        
        if not isinstance(state, np.ndarray):
            continue
        
        is_valid, reason = check_move_validity(prev_move, move, state)
        if is_valid:
            valid_moves += 1
            prev_move = move
        else:
            invalid_moves += 1
            invalid_move_reasons.append(reason)
    
    return valid_moves, invalid_moves, invalid_move_reasons

def analyze_batch(batch):
    total_valid_moves = 0
    total_invalid_moves = 0
    all_invalid_move_reasons = []
    
    for game in tqdm(batch, desc="Analyzing games", leave=False):
        try:
            valid_moves, invalid_moves, invalid_move_reasons = analyze_game(game)
            total_valid_moves += valid_moves
            total_invalid_moves += invalid_moves
            all_invalid_move_reasons.extend(invalid_move_reasons)
        except Exception as e:
            pass  # Silently skip errors for now
    
    return total_valid_moves, total_invalid_moves, all_invalid_move_reasons

def analyze_dataset_parallel(training_data, num_processes):
    chunk_size = max(1, len(training_data) // num_processes)
    batches = [training_data[i:i + chunk_size] for i in range(0, len(training_data), chunk_size)]
    
    with mp.Pool(processes=num_processes) as pool:
        results = list(tqdm(pool.imap(analyze_batch, batches), total=len(batches), desc="Processing batches"))
    
    valid_moves = sum(r[0] for r in results)
    invalid_moves = sum(r[1] for r in results)
    invalid_move_reasons = [reason for r in results for reason in r[2]]
    
    return valid_moves, invalid_moves, invalid_move_reasons

if __name__ == '__main__':
    try:
        with open('super_tic_tac_toe_training_data_combined.pkl', 'rb') as f:
            training_data = pickle.load(f)

        print(f"Total number of items in the dataset: {len(training_data)}")
        
        num_processes = mp.cpu_count()
        valid_moves, invalid_moves, invalid_move_reasons = analyze_dataset_parallel(training_data, num_processes)
        
        print(f"\nAnalysis complete.")
        total_moves = valid_moves + invalid_moves
        print(f"Total moves analyzed: {total_moves}")
        print(f"Valid moves: {valid_moves}")
        print(f"Invalid moves: {invalid_moves}")
        
        if total_moves > 0:
            print(f"Percentage of valid moves: {valid_moves / total_moves * 100:.2f}%")
        else:
            print("No moves were analyzed. The dataset might be empty or all games were skipped.")

        if invalid_moves > 0:
            print("\nMost common invalid move reasons:")
            reason_counts = Counter(invalid_move_reasons)
            for reason, count in reason_counts.most_common(5):
                print(f"{reason}: {count} times")
        else:
            print("\nAll moves in the dataset follow the rules of Super Tic-Tac-Toe!")

    except Exception as e:
        print(f"An error occurred during analysis: {str(e)}")
