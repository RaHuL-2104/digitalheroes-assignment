insert into public.charities (name, description, upcoming_events, is_featured, country_code)
values
  (
    'Fairway Futures',
    'Supports underserved youth through sports scholarships and mentorship.',
    'City Charity Golf Day - May 15',
    true,
    'IN'
  ),
  (
    'Green Hearts Relief',
    'Funds emergency support and medical aid for low-income families.',
    'Fundraising scramble - June 3',
    false,
    'IN'
  ),
  (
    'Birdie for Books',
    'Builds reading labs and teacher support programs in rural communities.',
    'School impact showcase - April 22',
    false,
    'IN'
  )
on conflict (name) do nothing;
