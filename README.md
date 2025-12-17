# Interactive Bézier Rope Simulation

## Project Overview
This project is a physics-based interactive simulation of a Cubic Bézier curve, designed to behave like a dynamic rope. It was built from scratch using **HTML5 Canvas** and **JavaScript**, avoiding any pre-built physics or graphics libraries.

The simulation demonstrates the intersection of computational geometry (Bézier mathematics) and procedural animation (Spring-Damper physics), allowing users to interact with control points via mouse input while observing real-time tangent visualizations.

https://github.com/user-attachments/assets/4d758b86-3f15-4eb4-be52-f669ebc1d6f3

## Technical Implementation

### 1. Mathematical Model (Bézier Geometry)
The core of the simulation relies on the explicit definition of a Cubic Bézier curve. Instead of using the Canvas API's built-in `bezierCurveTo`, the curve is calculated manually to allow for precise control over the physics resolution.

**The Formula:**
The curve is generated using the explicit parametric equation for a Cubic Bézier curve, where $t$ ranges from 0 to 1:

$$B(t) = (1-t)^3P_0 + 3(1-t)^2tP_1 + 3(1-t)t^2P_2 + t^3P_3$$

* **Implementation:** In `getBezierPoint(t, ...)`, I expanded the Bernstein basis polynomials (e.g., `3 * mt2 * t`) to calculate the exact X and Y coordinates for any given $t$.
* **Sampling:** The curve is rendered by sampling this function 100 times (`t = 0.01` steps) to ensure smoothness.

### 2. Tangent Visualization (Calculus)
To visualize the slope of the curve at specific points, I implemented the first derivative of the Bézier function. This vector represents the velocity/direction of the curve at parameter $t$.

**The Derivative:**

$$B'(t) = 3(1-t)^2(P_1 - P_0) + 6(1-t)t(P_2 - P_1) + 3t^2(P_3 - P_2)$$

* **Implementation:** The function `getBezierTangent` computes this vector by calculating the differences between control points ($V_1 = P_1 - P_0$, etc.) and weighting them by the derivative of the Bernstein polynomials.
* **Normalization:** The resulting vector is normalized to unit length and scaled to a user-defined `TANGENT_LENGTH` for rendering.

### 3. Physics Model (Spring-Mass-Damper)
To create the "rope-like" feel, the control points ($P_1$ and $P_2$) are not set instantly to the mouse position. Instead, they follow the mouse using a **Spring-Damper system**.

**Physics Loop:**
The motion is governed by Hooke's Law combined with a damping force to prevent infinite oscillation.

$$F_{total} = F_{spring} + F_{damping}$$
$$a = k \cdot (x_{target} - x_{current}) - c \cdot v$$

* **$k$ (Stiffness):** Controls how tightly the point tracks the mouse.
* **$c$ (Damping):** Simulates air resistance/friction to smooth out the movement.
* **Integration:** I used **Semi-Implicit Euler Integration** in the `applySpringPhysics` function. Velocity is updated based on acceleration, and then position is updated based on the new velocity:
    ```javascript
    velocity += acceleration * deltaTime;
    position += velocity * deltaTime;
    ```

## Design Choices & Architecture

### Input State Machine
To manage complexity in user interaction, I implemented a simple state machine for the `activeControl` variable. This allows the application to cleanly switch between modes without complex nested `if` statements:
* **ALL:** Both control points spring toward the mouse (relative offset).
* **P1 / P2:** Only the specific selected point responds to physics.
* **LOCKED:** Input is ignored, allowing the user to observe the settling physics.

### Rendering vs. Physics Separation
The main loop is decoupled into `update(deltaTime)` and `draw()`.
* **Update:** Handles the math and physics integration. It uses `deltaTime` to ensure the physics speed is consistent regardless of the frame rate.
* **Draw:** Handles strictly the Canvas API calls (`ctx.lineTo`, `ctx.stroke`), ensuring a separation of concerns between logic and presentation.

### Visual Clarity
* **Tangents:** Tangent lines are rendered with a slight normal offset from the curve. This prevents visual clutter, making it easier to distinguish the tangent vector from the curve path itself.
* **UI Controls:** A custom control panel was implemented to allow real-time tuning of $k$ (stiffness) and damping, aiding in the debugging and analysis of the physics model.

## Setup and Usage

1.  **Run:** Open `index.html` in any modern web browser.
2.  **Interact:**
    * Move the mouse to pull the rope.
    * **Click** on a specific control point (blue circle) to drag only that point.
    * **Click** on empty space to lock/unlock the simulation.
3.  **Configure:** Use the top-right panel to adjust the spring stiffness, damping friction, and tangent visualization length.
