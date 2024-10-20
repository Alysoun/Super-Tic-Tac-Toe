import pickle
import numpy as np
from collections import Counter
from tqdm import tqdm
import matplotlib.pyplot as plt
import traceback

def load_data(file_path):
    with open(file_path, 'rb') as f:
        return pickle.load(f)

def analyze_data(data):
    game_lengths = []
    win_counts = Counter()
    first_player_counts = Counter()
    first_actual_moves = {1: [], -1: []}
    last_actual_moves = {1: [], -1: [], 0: []}  # 0 for ties
    games_analyzed = 0
    timed_out_games = 0
    errored_games = 0

    min_length = float('inf')
    max_length = 0

    for game in tqdm(data, desc="Analyzing games"):
        if game is None:
            timed_out_games += 1
            continue
        if not game:  # Skip empty games
            errored_games += 1
            continue
        
        games_analyzed += 1
        game_length = len(game) - 1  # Subtract 1 to exclude the initial state
        game_lengths.append(game_length)
        min_length = min(min_length, game_length)
        max_length = max(max_length, game_length)
        
        first_player, _, _ = game[0]
        first_player_counts[first_player] += 1
        
        # Find the first actual move
        for player, state, move in game[1:]:  # Start from the second element
            if move is not None:
                first_actual_moves[player].append(move)
                break
        
        # Get the winner and last actual move
        winner = game[-1][0]
        last_actual_move = game[-2][2]  # Second-to-last move
        
        if winner == 1:
            win_counts[1] += 1
            last_actual_moves[1].append(last_actual_move)
        elif winner == -1:
            win_counts[-1] += 1
            last_actual_moves[-1].append(last_actual_move)
        elif winner == 0:
            win_counts['Tie'] += 1
            last_actual_moves[0].append(last_actual_move)
        else:
            win_counts['Unknown'] += 1

    print(f"\nTotal games analyzed: {games_analyzed}")
    print(f"Timed out games: {timed_out_games}")
    print(f"Errored games: {errored_games}")
    print(f"Final win counts: {dict(win_counts)}")
    print(f"First player counts: {dict(first_player_counts)}")
    print(f"\nMinimum game length: {min_length} moves")
    print(f"Maximum game length: {max_length} moves")
    print(f"Median game length: {np.median(game_lengths):.2f} moves")

    print("\nLast actual move statistics:")
    for player in [1, -1, 0]:
        player_label = "X" if player == 1 else "O" if player == -1 else "Tie"
        total_moves = len(last_actual_moves[player])
        none_moves = sum(1 for move in last_actual_moves[player] if move is None)
        print(f"{player_label}: Total: {total_moves}, None: {none_moves}")

    # Sample last moves
    print("\nSample last moves:")
    for player in [1, -1, 0]:
        player_label = "X" if player == 1 else "O" if player == -1 else "Tie"
        print(f"{player_label}: {last_actual_moves[player][:10]}")  # Print first 10 last moves

    return game_lengths, win_counts, first_player_counts, first_actual_moves, last_actual_moves

def plot_game_length_distribution(game_lengths):
    plt.figure(figsize=(12, 6))
    plt.hist(game_lengths, bins=50, edgecolor='black')
    plt.title('Distribution of Game Lengths')
    plt.xlabel('Number of Moves')
    plt.ylabel('Frequency')
    plt.axvline(np.mean(game_lengths), color='r', linestyle='dashed', linewidth=2, label=f'Mean: {np.mean(game_lengths):.2f}')
    plt.axvline(np.median(game_lengths), color='g', linestyle='dashed', linewidth=2, label=f'Median: {np.median(game_lengths):.2f}')
    plt.legend()
    plt.savefig('game_length_distribution.png')
    plt.close()

def plot_first_move_heatmap(first_actual_moves):
    for player in [1, -1]:
        first_move_counts = Counter(first_actual_moves[player])
        heatmap = np.zeros((9, 9))
        for move, count in first_move_counts.items():
            row, col = divmod(move, 9)
            heatmap[row, col] = count
        
        plt.figure(figsize=(10, 10))
        plt.imshow(heatmap, cmap='YlOrRd')
        plt.colorbar(label='Frequency')
        plt.title(f'Heatmap of First Actual Moves (Player {player})')
        for i in range(9):
            for j in range(9):
                plt.text(j, i, int(heatmap[i, j]), ha='center', va='center')
        plt.savefig(f'first_move_heatmap_player_{player}.png')
        plt.close()

def plot_last_move_heatmap(last_actual_moves):
    for player in [1, -1, 0]:
        last_move_counts = Counter(last_actual_moves[player])
        heatmap = np.zeros((9, 9))
        total_moves = 0
        for move, count in last_move_counts.items():
            if move is not None:
                row, col = divmod(move, 9)
                heatmap[row, col] = count
                total_moves += count
        
        plt.figure(figsize=(10, 10))
        plt.imshow(heatmap, cmap='YlOrRd')
        plt.colorbar(label='Frequency')
        player_label = "X" if player == 1 else "O" if player == -1 else "Tie"
        plt.title(f'Heatmap of Last Actual Moves ({player_label})\nTotal Moves: {total_moves}')
        for i in range(9):
            for j in range(9):
                plt.text(j, i, int(heatmap[i, j]), ha='center', va='center')
        plt.savefig(f'last_move_heatmap_player_{player_label}.png')
        plt.close()

        print(f"\nMove distribution for {player_label}:")
        for i in range(9):
            for j in range(9):
                print(f"{int(heatmap[i, j]):4d}", end=" ")
            print()

def plot_win_distribution(win_counts):
    labels = list(win_counts.keys())
    sizes = list(win_counts.values())
    plt.figure(figsize=(10, 10))
    plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
    plt.axis('equal')
    plt.title('Win Distribution')
    plt.savefig('win_distribution.png')
    plt.close()

if __name__ == '__main__':
    try:
        file_path = 'super_tic_tac_toe_training_data_combined.pkl'
        data = load_data(file_path)
        print(f"Total number of games in dataset: {len(data)}")
        if data:
            print(f"First game length: {len(data[0])}")
            print(f"First move of first game: {data[0][0]}")
        
        game_lengths, win_counts, first_player_counts, first_actual_moves, last_actual_moves = analyze_data(data)
        
        print(f"\nTotal number of games analyzed: {len(game_lengths)}")
        print(f"Average game length: {np.mean(game_lengths):.2f} moves")
        
        print("\nWin distribution:")
        total_games = sum(win_counts.values())
        for player, count in win_counts.items():
            print(f"{player}: {count} wins ({count/total_games*100:.2f}%)")
        
        print("\nFirst player distribution:")
        for player, count in first_player_counts.items():
            print(f"Player {player} went first in {count} games ({count/total_games*100:.2f}%)")

        plot_game_length_distribution(game_lengths)
        plot_first_move_heatmap(first_actual_moves)
        plot_last_move_heatmap(last_actual_moves)
        plot_win_distribution(win_counts)
        
        print("\nAnalysis complete. Check the generated PNG files for visualizations.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        traceback.print_exc()
