import pickle
import os
from tqdm import tqdm

def combine_batch_files(num_files, output_filename='super_tic_tac_toe_training_data_combined.pkl'):
    print("Combining batch files into a single file...")
    combined_data = []
    total_moves = 0
    total_games = 0

    for i in tqdm(range(num_files), desc="Processing batches"):
        filename = f'super_tic_tac_toe_training_data_batch_{i}.pkl'
        if os.path.exists(filename):
            with open(filename, 'rb') as f:
                batch_data = pickle.load(f)
                combined_data.extend(batch_data)
                total_games += len(batch_data)
                total_moves += sum(len(game) for game in batch_data if game is not None)
            os.remove(filename)  # Remove the batch file after combining
        else:
            print(f"Warning: {filename} not found. Skipping.")

    print(f"Saving combined data to {output_filename}...")
    with open(output_filename, 'wb') as f:
        pickle.dump(combined_data, f)
    
    print("Combined file saved successfully!")
    print(f"Total games in combined data: {total_games}")
    print(f"Total moves in combined data: {total_moves}")
    return total_games, total_moves

if __name__ == '__main__':
    num_files = 100  # The number of batch files you generated
    output_filename = 'super_tic_tac_toe_training_data_combined.pkl'

    total_games, total_moves = combine_batch_files(num_files, output_filename)

    print(f"All data combined into a single file: {output_filename}")
    print(f"Total games in combined data: {total_games}")
    print(f"Total moves in combined data: {total_moves}")
