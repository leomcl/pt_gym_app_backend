# Training Plan Analysis Algorithm

## Overview

The Training Plan Analysis Algorithm is a comprehensive system that analyzes weekly check-in data to determine if adjustments to a user's training plan are needed. The algorithm considers multiple factors including performance metrics, recovery indicators, plan adherence, and lifestyle factors to make intelligent recommendations.

## Architecture

### Core Components

1. **TrainingPlanAnalyzer** (`lib/core/services/training_plan_analyzer.dart`)
   - Main service containing the analysis algorithm
   - Processes weekly check-in data and generates recommendations

2. **TrainingAnalysisResult** (`lib/core/models/training_analysis_result.dart`)
   - Data structure containing analysis results and recommendations
   - Includes detailed scoring breakdowns and reasoning

3. **WeeklyCheckInCubit Integration**
   - Automatically triggers analysis after successful check-in submission
   - Outputs detailed analysis results to console for debugging

## Algorithm Logic

### Data Input

The algorithm analyzes data from the `WeeklyCheckInEntity` which contains:

#### Performance Metrics
- **Workout Completion**: Number of planned workouts completed (0-7+)
- **Plan Adherence**: How closely user followed the plan (`exactly`, `minor_modifications`, `significant_changes`)
- **Performance Improvement**: Subjective performance assessment (`improved`, `same`, `decreased`)

#### Recovery Indicators
- **Energy Levels**: Average energy level (1-10)
- **Sleep Quality**: Average sleep quality (1-10)
- **Muscle Soreness**: Level of muscle soreness (`none`, `mild`, `moderate`, `severe`)
- **Pain Experience**: Whether user experienced sharp/joint pain (boolean)
- **Pain Location**: Where pain was experienced (if applicable)

#### Lifestyle Factors
- **Stress Levels**: Average stress level (1-10)
- **Nutrition Adherence**: How well user stuck to nutrition goals (`on_point`, `mostly_on_track`, `few_slip_ups`, `write_off`)
- **Motivation Level**: Motivation and engagement level (1-10)

### Scoring System

#### Individual Metric Scores (0.0 to 1.0)

1. **Workout Completion Score**
   - 5+ workouts: 1.0 (Excellent)
   - 4 workouts: 0.8 (Very good)
   - 3 workouts: 0.6 (Good)
   - 2 workouts: 0.4 (Below target)
   - 1 workout: 0.2 (Poor)
   - 0 workouts: 0.0 (No workouts)

2. **Plan Adherence Score**
   - `exactly`: 1.0
   - `minor_modifications`: 0.7
   - `significant_changes`: 0.3

3. **Performance Score**
   - `improved`: 1.0
   - `same`: 0.6
   - `decreased`: 0.2

4. **Recovery Score**
   - Base score: 1.0
   - Pain penalty: -0.5
   - Soreness penalties: severe (-0.4), moderate (-0.2), mild (-0.1)

5. **Scale-based Scores** (Energy, Sleep, Motivation)
   - Normalized from 1-10 scale to 0.0-1.0 range

6. **Stress Score**
   - Inverted scale: (11 - stress_level) / 10
   - Lower stress = higher score

7. **Nutrition Score**
   - `on_point`: 1.0
   - `mostly_on_track`: 0.8
   - `few_slip_ups`: 0.5
   - `write_off`: 0.2

#### Factor Aggregation

Individual metrics are grouped into four major factors:

1. **Performance Factor** (35% weight in overall score)
   - Workout completion: 40%
   - Plan adherence: 30%
   - Performance trends: 30%

2. **Recovery Factor** (35% weight in overall score)
   - Energy levels: 30%
   - Sleep quality: 30%
   - Recovery indicators: 40%

3. **Adherence Factor** (20% weight in overall score)
   - Plan adherence: 60%
   - Motivation level: 40%

4. **Lifestyle Factor** (10% weight in overall score)
   - Stress levels: 50%
   - Nutrition adherence: 50%

### Recommendation Logic

The algorithm generates one of five possible recommendations:

#### 1. Maintain (0.6 ≤ overall score < 0.8)
- Current plan is working well
- Progress is steady and sustainable
- No significant issues detected

#### 2. Increase (overall score ≥ 0.8)
- User is ready for progression
- High performance and recovery scores
- Excellent adherence and motivation

#### 3. Decrease (overall score < 0.4)
- Training load is too high
- Poor recovery or performance indicators
- High stress levels impacting progress

#### 4. Modify (0.4 ≤ overall score < 0.6)
- Plan structure needs adjustment
- Low workout completion or adherence issues
- Specific exercise struggles reported

#### 5. Deload (recovery score < 0.3)
- Critical recovery indicators
- Severe muscle soreness or fatigue
- Signs of overreaching

### Override Conditions

Certain conditions override the normal scoring logic:

1. **Pain Override**: If user reports pain → Recommend `decrease`
2. **Recovery Override**: If recovery score < 0.3 → Recommend `deload`
3. **Completion Override**: If workout completion < 50% → Recommend `modify`

### Confidence Scoring

The algorithm calculates a confidence score (0.0 to 1.0) based on:

- **Data Completeness**: Penalizes missing optional fields
- **Data Consistency**: Penalizes high variance between factor scores
- **Logical Consistency**: Identifies contradictory data patterns

Confidence adjustments:
- Missing weight data: -0.1
- Missing exercise struggles (when relevant): -0.05
- Missing pain location (when pain reported): -0.1
- High factor variance (>0.3): -0.2

## Output Format

The algorithm generates detailed output including:

### Summary Information
- Overall recommendation
- Confidence percentage
- Overall score
- Week date range

### Factor Breakdown
- Performance factor score
- Recovery factor score
- Adherence factor score
- Lifestyle factor score

### Specific Reasons
- Tailored explanations for the recommendation
- Highlighting key contributing factors
- Actionable insights for the user

### Detailed Metrics
- Individual metric scores for debugging
- Raw data values with context
- Variance analysis

## Usage Examples

### Example 1: High Performer Ready for Progression

```
Input Data:
- Workout Completion: 5
- Plan Adherence: "exactly"
- Performance: "improved"
- Energy: 8/10, Sleep: 8/10
- No pain, mild soreness
- Low stress, good nutrition

Result: INCREASE recommendation (score: 0.85, confidence: 95%)
```

### Example 2: Struggling with Recovery

```
Input Data:
- Workout Completion: 3
- Plan Adherence: "minor_modifications"
- Performance: "same"
- Energy: 4/10, Sleep: 5/10
- Moderate soreness, no pain
- High stress (8/10)

Result: DECREASE recommendation (score: 0.35, confidence: 88%)
```

### Example 3: Plan Structural Issues

```
Input Data:
- Workout Completion: 2
- Plan Adherence: "significant_changes"
- Performance: "decreased"
- Exercise struggles: "form_issues"
- Reasonable recovery metrics

Result: MODIFY recommendation (score: 0.45, confidence: 82%)
```

## Integration Points

### Automatic Analysis
- Triggered after successful weekly check-in submission
- Runs in background without user intervention
- Results printed to console for debugging

### Future Enhancements
- Historical trend analysis using previous check-ins
- Machine learning model integration
- Personalized algorithm weighting based on user characteristics
- Real-time plan adjustments with coach approval workflows

## Development Notes

### Testing Strategy
- Unit tests for individual scoring functions
- Integration tests for complete analysis workflows
- Edge case testing for extreme data values
- Confidence scoring validation

### Performance Considerations
- Algorithm runs in O(1) time complexity
- Minimal memory footprint
- Suitable for real-time analysis

### Extensibility
- Modular scoring system allows easy metric addition
- Configurable weights for different user types
- Plugin architecture for custom recommendation logic

## Monitoring and Debugging

### Console Output
The algorithm provides comprehensive console output including:
- Analysis header with user and date information
- Complete scoring breakdown
- Factor calculations
- Recommendation reasoning
- Confidence assessment

### Error Handling
- Graceful handling of missing data
- Fallback values for incomplete check-ins
- Error logging for debugging
- Continues operation despite individual metric failures

## Security and Privacy

### Data Handling
- No data persistence in the analyzer
- Analysis results not stored permanently
- User data remains within established privacy boundaries
- No external API calls or data transmission

### Compliance
- Follows existing app privacy policies
- Maintains data sovereignty
- Supports user data deletion requirements