import pickle
import numpy as np
from sklearn.model_selection import train_test_split

# Load the dataset
with open('super_tic_tac_toe_training_data_combined.pkl', 'rb') as f:
    training_data = pickle.load(f)

# Split data into board states (X) and moves (y)
X = []
y = []

for game in training_data:
    if game is not None:
        for player, state, move in game[1:]:  # Skip the initial state
            if state is not None and move is not None:
                X.append(state.flatten())  # Flatten the board state to use as input
                y.append(move)

# Convert lists to numpy arrays
X = np.array(X)
y = np.array(y)

# Split the data into training and testing sets (e.g., 80% training, 20% testing)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Data successfully preprocessed!")
print(f"Total samples: {len(X)}, Training samples: {len(X_train)}, Testing samples: {len(X_test)}")

# Optionally, save the preprocessed data
with open('preprocessed_data.pkl', 'wb') as f:
    pickle.dump((X_train, X_test, y_train, y_test), f)

print("Preprocessed data saved to 'preprocessed_data.pkl'")
