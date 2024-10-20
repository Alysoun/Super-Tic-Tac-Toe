import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Input

# Load the preprocessed data
with open('preprocessed_data.pkl', 'rb') as f:
    X_train, X_test, y_train, y_test = pickle.load(f)

# Define the model
model = Sequential([
    Input(shape=(81,)),  # Input layer with 81 nodes for the flattened 9x9 board
    Dense(256, activation='relu'),  # First hidden layer with 256 units
    Dense(128, activation='relu'),  # Second hidden layer with 128 units
    Dense(81, activation='softmax')  # Output layer with 81 nodes for move probabilities
])

# Compile the model
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# Train the model
history = model.fit(X_train, y_train, epochs=20, batch_size=32, validation_split=0.2)

# Save the trained model
model.save('super_tic_tac_toe_model')

print("Model training complete and saved as 'super_tic_tac_toe_model'")

# Evaluate the model on the test data
test_loss, test_accuracy = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {test_accuracy:.2f}")
