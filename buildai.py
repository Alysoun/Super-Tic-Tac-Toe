import numpy as np
import random
import pickle
from tqdm.auto import tqdm
from multiprocessing import Pool, cpu_count, freeze_support
import time
import logging
import os
import traceback
from functools import partial
import sys
import signal
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define the SuperTicTacToe game class
class SuperTicTacToe:
    def __init__(self, starting_player=1):
        # 9x9 board represented as a flattened array of 81 elements
        self.board = np.zeros((9, 9), dtype=int)
        self.current_player = starting_player  # 1 for 'X', -1 for 'O'
        self.sub_board_status = np.zeros(9, dtype=int)  # Tracks the status of each 3x3 board
        self.next_valid_sub_board = None  # Can be None (any sub-board) or 0-8

    def is_valid_move(self, move):
        # Check if the move is valid
        if self.board[move // 9, move % 9] != 0:
            return False  # Cell is already occupied
        if self.next_valid_sub_board is not None:
            # Move must be within the active sub-board
            sub_board_index = move // 9
            if sub_board_index != self.next_valid_sub_board:
                return False
        return True

    def make_move(self, move):
        row, col = divmod(move, 9)
        sub_board = (row // 3) * 3 + (col // 3)
        
        if self.next_valid_sub_board is not None and sub_board != self.next_valid_sub_board:
            return False
        
        if self.board[row, col] == 0:
            self.board[row, col] = self.current_player
            self.update_sub_board_status(sub_board)
            self.next_valid_sub_board = (row % 3) * 3 + (col % 3)
            
            # If the next sub-board is full or won, allow move in any sub-board
            if self.sub_board_status[self.next_valid_sub_board] != 0:
                self.next_valid_sub_board = None
            
            self.current_player = -self.current_player
            return True
        return False

    def update_sub_board_status(self, sub_board):
        row_start = (sub_board // 3) * 3
        col_start = (sub_board % 3) * 3
        sub_board_array = self.board[row_start:row_start+3, col_start:col_start+3]

        # Check rows, columns, and diagonals
        for i in range(3):
            if np.all(sub_board_array[i, :] == self.current_player) or \
               np.all(sub_board_array[:, i] == self.current_player):
                self.sub_board_status[sub_board] = self.current_player
                return

        if np.all(np.diag(sub_board_array) == self.current_player) or \
           np.all(np.diag(np.fliplr(sub_board_array)) == self.current_player):
            self.sub_board_status[sub_board] = self.current_player
            return

        # Check if the sub-board is full (tie)
        if np.all(sub_board_array != 0):
            self.sub_board_status[sub_board] = 3  # Use 3 to represent a tie

    def is_game_over(self):
        # Check if the overall game is over based on the status of the 3x3 boards
        meta_board = self.sub_board_status.reshape(3, 3)
        for player in [1, -1]:
            for i in range(3):
                if np.all(meta_board[i, :] == player) or np.all(meta_board[:, i] == player):
                    return True
            if np.all(np.diag(meta_board) == player) or np.all(np.diag(np.fliplr(meta_board)) == player):
                return True
        
        # Check for a tie (all sub-boards are filled)
        if np.all(self.sub_board_status != 0):
            return True
        
        return False

    def get_valid_moves(self):
        if self.next_valid_sub_board is None:
            valid_sub_boards = [i for i in range(9) if self.sub_board_status[i] == 0]
        else:
            valid_sub_boards = [self.next_valid_sub_board]

        valid_moves = []
        for sub_board in valid_sub_boards:
            row_start = (sub_board // 3) * 3
            col_start = (sub_board % 3) * 3
            for i in range(3):
                for j in range(3):
                    move = (row_start + i) * 9 + (col_start + j)
                    if self.board.flatten()[move] == 0:
                        valid_moves.append(move)
        return valid_moves

    def get_winner(self):
        meta_board = self.sub_board_status.reshape(3, 3)
        for player in [1, -1]:
            for i in range(3):
                if np.all(meta_board[i, :] == player) or np.all(meta_board[:, i] == player):
                    return player
            if np.all(np.diag(meta_board) == player) or np.all(np.diag(np.fliplr(meta_board)) == player):
                return player
        
        if np.all(self.sub_board_status != 0):
            return 0  # Tie
        
        return None  # Game not over

# Define a basic AI that plays randomly
class BasicAI:
    def __init__(self, player):
        self.player = player

    def choose_move(self, game):
        valid_moves = game.get_valid_moves()
        if valid_moves:
            return random.choice(valid_moves)
        return None

def play_single_game_with_timeout(game_number, timeout=5):
    starting_player = 1 if random.random() < 0.5 else -1
    game = SuperTicTacToe(starting_player=starting_player)
    ai1 = BasicAI(1)
    ai2 = BasicAI(-1)
    game_data = [(starting_player, None, None)]
    start_time = time.time()
    move_count = 0

    try:
        while not game.is_game_over():
            if time.time() - start_time > timeout:
                print(f"Game {game_number} timed out after {timeout} seconds and {move_count} moves.")
                return None  # Return None for timed-out games

            current_state = game.board.copy()
            move = ai1.choose_move(game) if game.current_player == 1 else ai2.choose_move(game)
            
            if move is None:
                print(f"Game {game_number} ended after {move_count} moves: No valid moves available.")
                break

            if game.make_move(move):
                game_data.append((game.current_player, current_state, move))
                move_count += 1
            else:
                print(f"Game {game_number} ended after {move_count} moves: Invalid move.")
                break

        # Record the final game state and outcome
        final_state = game.board.copy()
        outcome = game.get_winner()
        game_data.append((outcome, final_state, None))

        print(f"Game {game_number} completed successfully with {move_count} moves. Outcome: {outcome}")
        print(f"Game data length: {len(game_data)}, Last move: {game_data[-1]}")
        return game_data
    except Exception as e:
        print(f"Error in game {game_number} after {move_count} moves:")
        print(traceback.format_exc())
        return None  # Return None for errored games

def save_checkpoint(batch_start, total_moves, file_count):
    checkpoint = {
        'batch_start': batch_start,
        'total_moves': total_moves,
        'file_count': file_count
    }
    with open('checkpoint.json', 'w') as f:
        json.dump(checkpoint, f)

def load_checkpoint():
    if os.path.exists('checkpoint.json'):
        with open('checkpoint.json', 'r') as f:
            return json.load(f)
    return None

def generate_and_save_training_data(num_games=100000, batch_size=1000, game_timeout=5, batch_timeout=300):
    checkpoint_file = 'training_data_checkpoint.json'
    
    # Load checkpoint if it exists
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, 'r') as f:
            checkpoint = json.load(f)
        total_moves = checkpoint['total_moves']
        file_count = checkpoint['file_count']
        total_games_processed = checkpoint['total_games_processed']
        batch_start = checkpoint['batch_start']
        print(f"Resuming from checkpoint. Starting at batch {file_count}, game {batch_start+1}")
    else:
        total_moves = 0
        file_count = 0
        total_games_processed = 0
        batch_start = 0

    try:
        with Pool(processes=cpu_count()) as pool:
            for batch_start in range(batch_start, num_games, batch_size):
                batch_end = min(batch_start + batch_size, num_games)
                print(f"Generating games {batch_start+1}-{batch_end}")
                
                batch_data = pool.map(play_single_game_with_timeout, range(batch_start+1, batch_end+1))
                
                if batch_data:
                    # Count outcomes
                    outcomes = []
                    timeout_count = 0
                    error_count = 0
                    valid_game_count = 0
                    
                    for game in batch_data:
                        if game is None:
                            timeout_count += 1
                        elif len(game) > 0:
                            last_move = game[-1]
                            if isinstance(last_move, tuple) and len(last_move) > 0:
                                outcome = last_move[0]
                                if outcome in [1, -1, 0]:
                                    outcomes.append(outcome)
                                    valid_game_count += 1
                                else:
                                    error_count += 1
                            else:
                                error_count += 1
                        else:
                            error_count += 1
                    
                    outcome_counts = {1: outcomes.count(1), -1: outcomes.count(-1), 0: outcomes.count(0)}
                    
                    print(f"Batch {file_count} outcomes: {outcome_counts}")
                    print(f"Timed out games: {timeout_count}")
                    print(f"Errored games: {error_count}")
                    print(f"Valid games: {valid_game_count}")
                    print(f"Total games processed in this batch: {len(batch_data)}")
                    
                    # Save the batch data
                    filename = f'super_tic_tac_toe_training_data_batch_{file_count}.pkl'
                    print(f"Saving batch {file_count} to {filename}...")
                    with open(filename, 'wb') as f:
                        pickle.dump(batch_data, f)
                    
                    total_moves += sum(len(game) for game in batch_data if game is not None)
                    total_games_processed += len(batch_data)
                    print(f"Batch {file_count} saved. Total moves so far: {total_moves}")
                    print(f"Total games processed so far: {total_games_processed}")
                    
                    file_count += 1

                    # Save checkpoint after each batch
                    checkpoint = {
                        'total_moves': total_moves,
                        'file_count': file_count,
                        'total_games_processed': total_games_processed,
                        'batch_start': batch_end
                    }
                    with open(checkpoint_file, 'w') as f:
                        json.dump(checkpoint, f)

    except KeyboardInterrupt:
        print("Process interrupted. Progress saved in checkpoint file.")
        return total_moves, file_count, total_games_processed
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Progress saved in checkpoint file.")
        return total_moves, file_count, total_games_processed

    # If we've completed successfully, remove the checkpoint file
    if os.path.exists(checkpoint_file):
        os.remove(checkpoint_file)
        print("Checkpoint file removed after successful completion.")

    return total_moves, file_count, total_games_processed

# Make sure this is wrapped in if __name__ == '__main__':
if __name__ == '__main__':
    from multiprocessing import freeze_support
    freeze_support()

    start_time = time.time()
    total_moves, num_files, total_games = generate_and_save_training_data(100000, game_timeout=5, batch_timeout=300)

    print(f"Training data generation complete! Time taken: {time.time() - start_time:.2f} seconds")
    print(f"Total moves recorded: {total_moves}")
    print(f"Total games processed: {total_games}")
    print(f"Data saved in {num_files} files")
    print("Training data saved successfully!")
