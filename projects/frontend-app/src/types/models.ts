export interface EventTypeJson {
    begin_date: Date;
    end_date: Date;
    event_image: string;
    event_name: string;
    event_description: string;
    type_name:string;
    type_description: string;
    type_price: string
    type_supply: string;
    type_max_per_user: string;
    event_location: Object;
  }