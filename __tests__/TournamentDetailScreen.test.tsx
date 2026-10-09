import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MockAdapter from 'axios-mock-adapter';
import API from '../src/api/axios';
import authReducer from '../src/store/slices/authSlice';
import tournamentReducer from '../src/store/slices/tournamentSlice';
import registrationReducer from '../src/store/slices/registrationSlice';
import teamReducer from '../src/store/slices/teamSlice';
import TournamentDetail from '../src/app/tournament/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 't1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  router: { push: jest.fn() },
  useIsFocused: () => true,
}));

const envelope = (payload: unknown) => ({ data: { data: payload } });

const tournament = (status: string) => ({
  _id: 't1',
  name: 'JBN Cricket Cup',
  sport: 'cricket',
  status,
  startDate: '2026-09-19T00:00:00.000Z',
  endDate: '2026-09-20T00:00:00.000Z',
  registrationDeadline: '2099-09-18T00:00:00.000Z',
  venue: { name: 'Bangalore Cricket Stadium', city: 'Bangalore' },
  registeredPlayersCount: 61,
  awards: [{ _id: 'a1', title: 'Clutch player of the tournament', team: { name: 'Deccan Dynamos' } }],
});

const category = (status: string) => ({
  _id: 'c1',
  name: 'Gold Cup',
  status,
  bracketType: 'knockout',
  isPaidRegistration: true,
  registrationFee: 500,
  isActive: true,
});

const final = {
  competitorType: 'team',
  rounds: {},
  matches: [{
    _id: 'f1', bracketRound: 'Final', matchNumber: 7, status: 'completed', winnerId: 'tm2', gameScores: [],
    teams: { team1Id: 'tm1', team1Name: 'Coastal Chargers', team2Id: 'tm2', team2Name: 'Deccan Dynamos' },
    result: { team1Summary: '138/9', team2Summary: '142/6' },
  }],
};

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(API); });
afterEach(() => { mock.restore(); });

function renderAt(tStatus: string, cStatus: string) {
  mock.onGet('/tournament/t1').reply(200, envelope(tournament(tStatus)));
  mock.onGet('/tournaments/t1/categories').reply(200, envelope([category(cStatus)]));
  mock.onGet('/tournaments/t1/teams').reply(200, envelope([
    { _id: 'tm1', name: 'Coastal Chargers', primaryColor: '#3aa0c8' },
    { _id: 'tm2', name: 'Deccan Dynamos', primaryColor: '#16C46A' },
  ]));
  mock.onGet('/matches/categories/c1').reply(200, envelope(final));
  mock.onGet('/auction/t1/c1/status').reply(200, envelope({ auction: { status: 'completed' } }));
  mock.onGet(/\/registrations\/teams\/.*\/roster/).reply(200, envelope({ players: [{}, {}] }));

  const store = configureStore({
    reducer: { auth: authReducer, tournament: tournamentReducer, registration: registrationReducer, team: teamReducer },
  });
  return render(<Provider store={store}><TournamentDetail /></Provider>);
}

describe('Tournament detail', () => {
  // The five tabs used to hide the champion, awards and auction results
  // behind separate taps. A finished tournament leads with its result and
  // keeps every category destination on the card.
  it('leads a finished tournament with its result, awards and every category link', async () => {
    renderAt('completed', 'completed');

    expect(await screen.findByText('Gold Cup champions')).toBeTruthy();
    expect(screen.getByText('142/6 – 138/9')).toBeTruthy();
    expect(screen.getByText('Clutch player of the tournament')).toBeTruthy();
    expect(screen.getByLabelText('Jump to Result')).toBeTruthy();
    expect(await screen.findByLabelText('Gold Cup auction')).toBeTruthy();
    expect(screen.getByLabelText('Gold Cup bracket')).toBeTruthy();
    expect(screen.getByLabelText('Deccan Dynamos, champions')).toBeTruthy();
    expect(screen.queryByLabelText(/^Enter Gold Cup/)).toBeNull();
  });

  it('offers entry while it is open, with a sticky button for the category', async () => {
    renderAt('registration_open', 'registration');

    expect(await screen.findByLabelText('Jump to Enter')).toBeTruthy();
    expect(await screen.findAllByLabelText('Enter Gold Cup, ₹500')).toHaveLength(2);
    expect(screen.getByText('Entries close in')).toBeTruthy();
    expect(screen.queryByText('Gold Cup champions')).toBeNull();
  });
});
