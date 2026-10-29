import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

type ActivityInput = {
  userId?: unknown;
  teamId?: unknown;
  type?: unknown;
  minutes?: unknown;
};

type TeamInput = {
  name?: unknown;
  mascot?: unknown;
  members?: unknown;
};

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

function requiredText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: ActivityInput) {
  const { userId, teamId, type, minutes } = input ?? {};
  if (!isObjectId(userId) || !isObjectId(teamId)) throw httpError('Valid userId and teamId are required', 400);
  if (!requiredText(type) || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError('A type and positive minutes value are required', 400);
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw httpError('The selected user or team does not exist', 400);

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: TeamInput) {
  const { name, mascot, members = [] } = input ?? {};
  if (!requiredText(name)) throw httpError('A team name is required', 400);
  if (!requiredText(mascot)) throw httpError('A team mascot is required', 400);
  if (!Array.isArray(members) || !members.every(isObjectId)) throw httpError('Team members must be valid user IDs', 400);

  if (members.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: members } });
    if (existingMembers !== members.length) throw httpError('One or more team members do not exist', 400);
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw httpError('User not found', 404);

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityFocus = recentActivity?.type.toLowerCase() === 'strength'
    ? 'strength'
    : recentActivity ? 'endurance' : undefined;
  const goalWorkouts = await Workout.find({ focus: user.fitnessGoal }).lean();
  const activityWorkouts = activityFocus && activityFocus !== user.fitnessGoal
    ? await Workout.find({ focus: activityFocus }).lean()
    : [];
  const workouts = goalWorkouts.length > 0
    ? goalWorkouts
    : activityWorkouts.length > 0
      ? activityWorkouts
      : await Workout.find().lean();
  const focus = goalWorkouts.length > 0 ? user.fitnessGoal : activityFocus;
  const reason = focus === user.fitnessGoal
    ? `Recommended for your ${user.fitnessGoal} fitness goal.`
    : focus
      ? `Recommended based on your recent ${recentActivity?.type} activity.`
      : 'Recommended as a general workout option.';

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
